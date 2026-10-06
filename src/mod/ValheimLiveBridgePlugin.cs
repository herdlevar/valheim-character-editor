using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using BepInEx;
using UnityEngine;
using Splatform;

namespace ValheimLiveBridge
{
    [BepInPlugin("com.antigravity.valheimlivebridge", "ValheimLiveBridge", "1.1.0")]
    public class ValheimLiveBridgePlugin : BaseUnityPlugin
    {
        private HttpListener _listener;
        private Thread _listenerThread;
        private bool _isRunning = false;
        private const int Port = 8765;

        private readonly Queue<Action> _mainThreadQueue = new Queue<Action>();
        private readonly object _queueLock = new object();

        void Awake()
        {
            Logger.LogInfo("Valheim Live Bridge v1.1.0 starting on http://127.0.0.1:" + Port + "/");
            StartServer();
        }

        void OnDestroy()
        {
            DestroyHologram();
            StopServer();
        }

        private static bool _isArmed = false;
        private static string _armedBlueprintName = "";
        private static List<BlueprintPiece> _armedPieces = null;
        private static float _armedRotationY = 0f;
        private static float _armedHeightOffset = 0f;
        private static bool _autoTerraform = true;
        private static int _diskBlueprintIndex = -1;
        private static GameObject _hologramRoot = null;
        private static readonly Dictionary<string, Material> _ghostMaterialCache = new Dictionary<string, Material>(StringComparer.OrdinalIgnoreCase);

        void Update()
        {
            // Process queued actions on Unity's main thread
            while (true)
            {
                Action action = null;
                lock (_queueLock)
                {
                    if (_mainThreadQueue.Count > 0)
                    {
                        action = _mainThreadQueue.Dequeue();
                    }
                }

                if (action == null) break;

                try
                {
                    action();
                }
                catch (Exception ex)
                {
                    Logger.LogError("Error executing main thread action: " + ex);
                }
            }

            // In-game Interactive Builder Controls
            try
            {
                if (Player.m_localPlayer != null)
                {
                    // F9: Toggle Fly Mode (No-Clip)
                    if (Input.GetKeyDown(KeyCode.F9))
                    {
                        bool current = Player.m_localPlayer.InDebugFlyMode();
                        ApplyFlyMode(Player.m_localPlayer, !current, true);
                    }

                    // Ctrl + Z: Undo Last Build
                    if ((Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl)) && Input.GetKeyDown(KeyCode.Z))
                    {
                        UndoLastBuild();
                    }

                    // F8: Undo Last Build
                    if (Input.GetKeyDown(KeyCode.F8))
                    {
                        UndoLastBuild();
                    }

                    // F6: Cycle local blueprint from disk
                    if (Input.GetKeyDown(KeyCode.F6))
                    {
                        CycleBlueprintFromDisk();
                    }

                    // F7: Quick Capture 15m radius around player as a new blueprint
                    if (Input.GetKeyDown(KeyCode.F7))
                    {
                        CaptureBlueprint("{\"radius\":15.0}");
                    }

                    // F10: Quick Harvest all ripe crops within 15m radius
                    if (Input.GetKeyDown(KeyCode.F10))
                    {
                        HarvestNearbyCrops("{\"radius\":15.0}");
                    }

                    // Interactive Blueprint Placement with 3D Hologram
                    if (_isArmed && _hologramRoot != null)
                    {
                        UpdateHologramPlacement(Player.m_localPlayer);
                    }
                }
            }
            catch { }
        }

        private void StartServer()
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://127.0.0.1:" + Port + "/");
                _listener.Prefixes.Add("http://localhost:" + Port + "/");
                _listener.Start();
                _isRunning = true;

                _listenerThread = new Thread(ListenLoop);
                _listenerThread.IsBackground = true;
                _listenerThread.Start();
                Logger.LogInfo("Valheim Live Bridge listening for web requests.");
            }
            catch (Exception ex)
            {
                Logger.LogError("Failed to start HTTP server: " + ex);
            }
        }

        private void StopServer()
        {
            _isRunning = false;
            try
            {
                if (_listener != null && _listener.IsListening)
                {
                    _listener.Stop();
                    _listener.Close();
                }
            }
            catch { }
        }

        private void ListenLoop()
        {
            while (_isRunning && _listener != null && _listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = _listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch (HttpListenerException)
                {
                    // Normal during shutdown
                    break;
                }
                catch (Exception ex)
                {
                    Logger.LogError("ListenLoop error: " + ex);
                }
            }
        }

        private void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            // Handle CORS preflight
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Accept");

            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            string rawUrl = request.Url.AbsolutePath.ToLowerInvariant();
            string method = request.HttpMethod.ToUpperInvariant();

            string responseJson = "{}";
            int statusCode = 200;

            try
            {
                if (method == "GET" && rawUrl == "/api/status")
                {
                    responseJson = RunOnMainThread(() => GetPlayerStatusJson());
                }
                else if (method == "GET" && rawUrl == "/api/inventory")
                {
                    responseJson = RunOnMainThread(() => GetInventoryJson());
                }
                else if (method == "POST" && rawUrl == "/api/apply-loadout")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => ApplyLoadout(body));
                }
                else if (method == "POST" && rawUrl == "/api/update-item")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => UpdateItem(body));
                }
                else if (method == "POST" && rawUrl == "/api/delete-item")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => DeleteItem(body));
                }
                else if (method == "POST" && rawUrl == "/api/move-item")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => MoveItem(body));
                }
                else if (method == "POST" && rawUrl == "/api/spawn-item")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SpawnItem(body));
                }
                else if (method == "POST" && rawUrl == "/api/set-inventory")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SetInventory(body));
                }
                else if (method == "POST" && rawUrl == "/api/set-boss-buff")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SetBossBuff(body));
                }
                else if (method == "POST" && rawUrl == "/api/set-god-mode")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SetGodMode(body));
                }
                else if (method == "POST" && rawUrl == "/api/set-no-cost")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SetNoCostMode(body));
                }
                else if (method == "POST" && rawUrl == "/api/repair-all")
                {
                    responseJson = RunOnMainThread(() => RepairAllItems());
                }
                else if (method == "POST" && rawUrl == "/api/set-ghost-mode")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SetGhostMode(body));
                }
                else if (method == "POST" && rawUrl == "/api/set-fly-mode")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SetFlyMode(body));
                }
                else if (method == "POST" && rawUrl == "/api/apply-rested")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => ApplyRestedBuff(body));
                }
                else if (method == "POST" && rawUrl == "/api/teleport")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => TeleportPlayer(body));
                }
                else if (method == "POST" && rawUrl == "/api/build-blueprint")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => BuildBlueprint(body));
                }
                else if (method == "POST" && rawUrl == "/api/undo-build")
                {
                    responseJson = RunOnMainThread(() => UndoLastBuild());
                }
                else if (method == "POST" && rawUrl == "/api/arm-blueprint")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => ArmBlueprint(body));
                }
                else if (method == "POST" && rawUrl == "/api/disarm-blueprint")
                {
                    responseJson = RunOnMainThread(() => DisarmBlueprint());
                }
                else if (method == "POST" && rawUrl == "/api/capture-blueprint")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => CaptureBlueprint(body));
                }
                else if (method == "POST" && rawUrl == "/api/terraform")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => HandleTerraformRequest(body));
                }
                else if (method == "POST" && rawUrl == "/api/plant-grid")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => PlantCropGrid(body));
                }
                else if (method == "POST" && rawUrl == "/api/harvest-crops")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => HarvestNearbyCrops(body));
                }
                else if (method == "GET" && rawUrl == "/api/farm-status")
                {
                    responseJson = RunOnMainThread(() => GetFarmStatusJson());
                }
                else if (method == "GET" && rawUrl == "/api/builder-state")
                {
                    responseJson = RunOnMainThread(() => GetBuilderStateJson());
                }
                else if (method == "GET" && rawUrl == "/api/planbuild/status")
                {
                    responseJson = RunOnMainThread(() => GetPlanBuildStatus());
                }
                else if (method == "POST" && rawUrl == "/api/planbuild/sync")
                {
                    string body = ReadRequestBody(request);
                    responseJson = RunOnMainThread(() => SyncToPlanBuild(body));
                }
                else if (method == "GET" && rawUrl == "/api/planbuild/list")
                {
                    responseJson = RunOnMainThread(() => GetPlanBuildBlueprintsList());
                }
                else if (method == "GET" && rawUrl == "/api/pins")
                {
                    responseJson = RunOnMainThread(() => GetPinsJson());
                }
                else if (method == "GET" && (rawUrl == "/api/map-texture" || rawUrl == "/api/map-texture.jpg"))
                {
                    byte[] img = RunOnMainThread(() => GetMapTextureJpg());
                    if (img != null && img.Length > 0)
                    {
                        response.ContentType = "image/jpeg";
                        response.StatusCode = 200;
                        response.ContentLength64 = img.Length;
                        try
                        {
                            response.OutputStream.Write(img, 0, img.Length);
                            response.OutputStream.Close();
                        }
                        catch { }
                        return;
                    }
                    else
                    {
                        statusCode = 404;
                        responseJson = "{\"error\":\"Map texture not available (not in world)\"}";
                    }
                }
                else if (method == "GET" && (rawUrl == "/api/fog-texture" || rawUrl == "/api/fog-texture.png"))
                {
                    byte[] img = RunOnMainThread(() => GetFogTexturePng());
                    if (img != null && img.Length > 0)
                    {
                        response.ContentType = "image/png";
                        response.StatusCode = 200;
                        response.ContentLength64 = img.Length;
                        try
                        {
                            response.OutputStream.Write(img, 0, img.Length);
                            response.OutputStream.Close();
                        }
                        catch { }
                        return;
                    }
                    else
                    {
                        statusCode = 404;
                        responseJson = "{\"error\":\"Fog texture not available\"}";
                    }
                }
                else
                {
                    statusCode = 404;
                    responseJson = "{\"error\":\"Endpoint not found\"}";
                }
            }
            catch (Exception ex)
            {
                statusCode = 500;
                responseJson = "{\"error\":\"" + EscapeJson(ex.Message) + "\"}";
            }

            byte[] buffer = Encoding.UTF8.GetBytes(responseJson);
            response.ContentType = "application/json";
            response.ContentEncoding = Encoding.UTF8;
            response.StatusCode = statusCode;
            response.ContentLength64 = buffer.Length;

            try
            {
                response.OutputStream.Write(buffer, 0, buffer.Length);
                response.OutputStream.Close();
            }
            catch { }
        }

        private string ReadRequestBody(HttpListenerRequest request)
        {
            if (!request.HasEntityBody) return "";
            using (StreamReader reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                return reader.ReadToEnd();
            }
        }

        private T RunOnMainThread<T>(Func<T> func)
        {
            T result = default(T);
            Exception exception = null;
            ManualResetEvent doneEvent = new ManualResetEvent(false);

            lock (_queueLock)
            {
                _mainThreadQueue.Enqueue(() =>
                {
                    try
                    {
                        result = func();
                    }
                    catch (Exception ex)
                    {
                        exception = ex;
                    }
                    finally
                    {
                        doneEvent.Set();
                    }
                });
            }

            if (!doneEvent.WaitOne(3000))
            {
                throw new TimeoutException("Unity main thread timed out handling request.");
            }

            if (exception != null)
            {
                throw exception;
            }

            return result;
        }

        // ==========================================
        // GAME ACTIONS (RUN ONLY ON UNITY MAIN THREAD)
        // ==========================================

        private string GetPlayerStatusJson()
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"online\":true,\"inGame\":false,\"message\":\"Player in menu\"}";
            }

            string name = player.GetPlayerName();
            string gp = player.GetGuardianPowerName();
            float gpCooldown = player.m_guardianPowerCooldown;
            float hp = player.GetHealth();
            float maxHp = player.GetMaxHealth();
            float stamina = player.GetStamina();
            bool isGod = player.InGodMode();
            bool isGhost = player.InGhostMode();
            bool isFly = false;
            try { isFly = player.InDebugFlyMode(); } catch { }
            bool noPlacement = GetNoPlacementCost(player);
            int itemCount = player.GetInventory() != null ? player.GetInventory().GetAllItems().Count : 0;

            bool isRested = false;
            float restedTime = 0f;
            if (player.GetSEMan() != null)
            {
                StatusEffect se = player.GetSEMan().GetStatusEffect("Rested".GetStableHashCode());
                if (se != null)
                {
                    isRested = true;
                    restedTime = se.GetRemaningTime();
                }
            }

            Vector3 pos = player.transform.position;
            Vector3 spawnPoint = Vector3.zero;
            bool haveSpawnPoint = false;
            Vector3 deathPoint = Vector3.zero;
            bool haveDeathPoint = false;

            if (Game.instance != null && Game.instance.GetPlayerProfile() != null)
            {
                PlayerProfile profile = Game.instance.GetPlayerProfile();
                haveSpawnPoint = profile.HaveCustomSpawnPoint();
                if (haveSpawnPoint) spawnPoint = profile.GetCustomSpawnPoint();

                haveDeathPoint = profile.HaveDeathPoint();
                if (haveDeathPoint) deathPoint = profile.GetDeathPoint();
            }

            StringBuilder sb = new StringBuilder();
            sb.Append("{");
            sb.Append("\"online\":true,");
            sb.Append("\"inGame\":true,");
            sb.Append("\"playerName\":\"" + EscapeJson(name) + "\",");
            sb.Append("\"guardianPower\":\"" + EscapeJson(gp) + "\",");
            sb.Append("\"guardianCooldown\":" + gpCooldown.ToString("F1") + ",");
            sb.Append("\"health\":" + hp.ToString("F1") + ",");
            sb.Append("\"maxHealth\":" + maxHp.ToString("F1") + ",");
            sb.Append("\"stamina\":" + stamina.ToString("F1") + ",");
            sb.Append("\"godMode\":" + (isGod ? "true" : "false") + ",");
            sb.Append("\"ghostMode\":" + (isGhost ? "true" : "false") + ",");
            sb.Append("\"flyMode\":" + (isFly ? "true" : "false") + ",");
            sb.Append("\"noPlacementCost\":" + (noPlacement ? "true" : "false") + ",");
            sb.Append("\"isRested\":" + (isRested ? "true" : "false") + ",");
            sb.Append("\"restedTime\":" + restedTime.ToString("F1") + ",");
            sb.Append("\"itemsCount\":" + itemCount + ",");
            sb.Append("\"position\":{");
            sb.Append("\"x\":" + pos.x.ToString("F1") + ",");
            sb.Append("\"y\":" + pos.y.ToString("F1") + ",");
            sb.Append("\"z\":" + pos.z.ToString("F1"));
            sb.Append("},");
            sb.Append("\"haveSpawnPoint\":" + (haveSpawnPoint ? "true" : "false") + ",");
            sb.Append("\"spawnPoint\":{");
            sb.Append("\"x\":" + spawnPoint.x.ToString("F1") + ",");
            sb.Append("\"y\":" + spawnPoint.y.ToString("F1") + ",");
            sb.Append("\"z\":" + spawnPoint.z.ToString("F1"));
            sb.Append("},");
            sb.Append("\"haveDeathPoint\":" + (haveDeathPoint ? "true" : "false") + ",");
            sb.Append("\"deathPoint\":{");
            sb.Append("\"x\":" + deathPoint.x.ToString("F1") + ",");
            sb.Append("\"y\":" + deathPoint.y.ToString("F1") + ",");
            sb.Append("\"z\":" + deathPoint.z.ToString("F1"));
            sb.Append("}");
            sb.Append("}");

            return sb.ToString();
        }

        private string GetInventoryJson()
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "[]";
            }

            List<ItemDrop.ItemData> items = player.GetInventory().GetAllItems();
            StringBuilder sb = new StringBuilder();
            sb.Append("[");

            for (int i = 0; i < items.Count; i++)
            {
                ItemDrop.ItemData item = items[i];
                if (item == null || item.m_dropPrefab == null) continue;

                if (sb.Length > 1) sb.Append(",");

                sb.Append("{");
                sb.Append("\"prefab\":\"" + EscapeJson(item.m_dropPrefab.name) + "\",");
                sb.Append("\"name\":\"" + EscapeJson(item.m_shared.m_name) + "\",");
                sb.Append("\"stack\":" + item.m_stack + ",");
                sb.Append("\"maxStack\":" + item.m_shared.m_maxStackSize + ",");
                sb.Append("\"quality\":" + item.m_quality + ",");
                sb.Append("\"durability\":" + item.m_durability.ToString("F1") + ",");
                sb.Append("\"maxDurability\":" + item.GetMaxDurability().ToString("F1") + ",");
                sb.Append("\"gridX\":" + item.m_gridPos.x + ",");
                sb.Append("\"gridY\":" + item.m_gridPos.y + ",");
                sb.Append("\"equipped\":" + (item.m_equipped ? "true" : "false"));
                sb.Append("}");
            }

            sb.Append("]");
            return sb.ToString();
        }

        private string UpdateItem(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            Inventory inv = player.GetInventory();
            int gridX = ExtractJsonInt(json, "gridX", -1);
            int gridY = ExtractJsonInt(json, "gridY", -1);
            string prefab = ExtractJsonString(json, "prefab");
            int stack = ExtractJsonInt(json, "stack", -1);
            int quality = ExtractJsonInt(json, "quality", -1);
            float durability = ExtractJsonFloat(json, "durability", -1f);

            ItemDrop.ItemData item = null;

            // 1. Try finding by exact grid coordinate
            if (gridX >= 0 && gridY >= 0)
            {
                item = inv.GetItemAt(gridX, gridY);
            }

            // 2. Fallback: match by prefab name
            if (item == null && !string.IsNullOrEmpty(prefab))
            {
                foreach (ItemDrop.ItemData i in inv.GetAllItems())
                {
                    if (i != null && i.m_dropPrefab != null &&
                        i.m_dropPrefab.name.Equals(prefab, StringComparison.OrdinalIgnoreCase))
                    {
                        item = i;
                        break;
                    }
                }
            }

            if (item == null)
            {
                return "{\"success\":false,\"error\":\"Item not found in inventory\"}";
            }

            // Remove if stack is set to 0
            if (stack == 0)
            {
                string removedName = item.m_shared.m_name;
                inv.RemoveItem(item);
                TriggerInventoryChanged(inv);
                player.Message(MessageHud.MessageType.Center, "Removed: " + removedName);
                return "{\"success\":true,\"action\":\"removed\"}";
            }

            // Update stack count
            if (stack > 0)
            {
                item.m_stack = stack;
            }

            // Update quality level
            if (quality > 0)
            {
                item.m_quality = quality;
            }

            // Update durability
            if (durability >= 0)
            {
                item.m_durability = durability;
            }

            // Notify Valheim inventory system of change to immediately recalculate weight and update UI
            TriggerInventoryChanged(inv);
            player.Message(MessageHud.MessageType.Center, "Updated: " + item.m_shared.m_name + " x" + item.m_stack);

            return "{\"success\":true,\"stack\":" + item.m_stack + ",\"quality\":" + item.m_quality + "}";
        }

        private string DeleteItem(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            Inventory inv = player.GetInventory();
            int gridX = ExtractJsonInt(json, "gridX", -1);
            int gridY = ExtractJsonInt(json, "gridY", -1);
            string prefab = ExtractJsonString(json, "prefab");

            ItemDrop.ItemData item = null;
            if (gridX >= 0 && gridY >= 0)
            {
                item = inv.GetItemAt(gridX, gridY);
            }

            if (item == null && !string.IsNullOrEmpty(prefab))
            {
                foreach (ItemDrop.ItemData i in inv.GetAllItems())
                {
                    if (i != null && i.m_dropPrefab != null &&
                        i.m_dropPrefab.name.Equals(prefab, StringComparison.OrdinalIgnoreCase))
                    {
                        item = i;
                        break;
                    }
                }
            }

            if (item != null)
            {
                string name = item.m_shared.m_name;
                inv.RemoveItem(item);
                TriggerInventoryChanged(inv);
                player.Message(MessageHud.MessageType.Center, "Removed: " + name);
                return "{\"success\":true}";
            }

            return "{\"success\":false,\"error\":\"Item not found\"}";
        }

        private string MoveItem(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            Inventory inv = player.GetInventory();
            int fromX = ExtractJsonInt(json, "fromX", -1);
            int fromY = ExtractJsonInt(json, "fromY", -1);
            int toX = ExtractJsonInt(json, "toX", -1);
            int toY = ExtractJsonInt(json, "toY", -1);

            if (fromX < 0 || fromY < 0 || toX < 0 || toY < 0)
            {
                return "{\"success\":false,\"error\":\"Invalid slot coordinates\"}";
            }

            ItemDrop.ItemData fromItem = inv.GetItemAt(fromX, fromY);
            ItemDrop.ItemData toItem = inv.GetItemAt(toX, toY);

            if (fromItem == null)
            {
                return "{\"success\":false,\"error\":\"No item at source slot\"}";
            }

            if (toItem != null)
            {
                toItem.m_gridPos = new Vector2i(fromX, fromY);
            }
            fromItem.m_gridPos = new Vector2i(toX, toY);

            TriggerInventoryChanged(inv);
            return "{\"success\":true}";
        }

        private string SetInventory(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            Inventory inv = player.GetInventory();
            List<FullItemReq> items = ParseFullInventoryRequests(json);
            if (items.Count == 0)
            {
                return "{\"success\":false,\"error\":\"No items in request\"}";
            }

            // Clear current inventory
            inv.RemoveAll();

            int added = 0;
            foreach (FullItemReq req in items)
            {
                if (string.IsNullOrEmpty(req.prefab) || req.stack <= 0) continue;

                ItemDrop.ItemData dropItem = inv.AddItem(
                    req.prefab,
                    req.stack,
                    req.quality > 0 ? req.quality : 1,
                    req.variant,
                    0,
                    "",
                    false, // don't auto-stack, place at specified slot
                    false  // don't play pickup chime for every item
                );

                if (dropItem != null)
                {
                    dropItem.m_gridPos = new Vector2i(req.gridX, req.gridY);
                    if (req.durability >= 0) dropItem.m_durability = req.durability;
                    dropItem.m_equipped = req.equipped;
                    added++;
                }
            }

            TriggerInventoryChanged(inv);
            player.Message(MessageHud.MessageType.Center, "Full Inventory Synced (" + added + " items)");
            return "{\"success\":true,\"count\":" + added + "}";
        }

        private string ApplyLoadout(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            Inventory inv = player.GetInventory();
            int repairedCount = 0;
            int addedCount = 0;

            // 1. Repair all items
            foreach (ItemDrop.ItemData item in inv.GetAllItems())
            {
                if (item != null && item.m_shared.m_useDurability)
                {
                    float maxDur = item.GetMaxDurability();
                    if (item.m_durability < maxDur)
                    {
                        item.m_durability = maxDur;
                        repairedCount++;
                    }
                }
            }

            // 2. Parse loadout items: [{"prefab":"Bread","amount":20,"quality":1}, ...]
            List<LoadoutReq> reqs = ParseLoadoutRequests(json);

            foreach (LoadoutReq req in reqs)
            {
                if (string.IsNullOrEmpty(req.prefab) || req.amount <= 0) continue;

                // Check existing amount in inventory
                int currentTotal = 0;
                List<ItemDrop.ItemData> matchingItems = new List<ItemDrop.ItemData>();

                foreach (ItemDrop.ItemData item in inv.GetAllItems())
                {
                    if (item != null && item.m_dropPrefab != null &&
                        item.m_dropPrefab.name.Equals(req.prefab, StringComparison.OrdinalIgnoreCase))
                    {
                        currentTotal += item.m_stack;
                        matchingItems.Add(item);
                    }
                }

                int needed = req.amount - currentTotal;
                if (needed <= 0) continue;

                GameObject prefabObj = ObjectDB.instance != null ? ObjectDB.instance.GetItemPrefab(req.prefab) : null;
                if (prefabObj == null)
                {
                    Logger.LogWarning("Prefab not found in ObjectDB: " + req.prefab);
                    continue;
                }

                ItemDrop drop = prefabObj.GetComponent<ItemDrop>();
                int maxStack = (drop != null && drop.m_itemData != null) ? drop.m_itemData.m_shared.m_maxStackSize : 1;

                // Top off existing non-full stacks
                foreach (ItemDrop.ItemData item in matchingItems)
                {
                    if (needed <= 0) break;
                    if (item.m_stack < maxStack)
                    {
                        int space = maxStack - item.m_stack;
                        int toAdd = Math.Min(space, needed);
                        item.m_stack += toAdd;
                        needed -= toAdd;
                        addedCount += toAdd;
                    }
                }

                // Add missing new stacks
                while (needed > 0)
                {
                    int stackToAdd = Math.Min(needed, maxStack);
                    ItemDrop.ItemData added = inv.AddItem(req.prefab, stackToAdd, req.quality > 0 ? req.quality : 1, 0, 0, "", true, true);
                    if (added != null)
                    {
                        needed -= stackToAdd;
                        addedCount += stackToAdd;
                    }
                    else
                    {
                        break;
                    }
                }
            }

            TriggerInventoryChanged(inv);
            string msg = "Editor Loadout Applied! (" + addedCount + " items, " + repairedCount + " repaired)";
            player.Message(MessageHud.MessageType.Center, msg);

            return "{\"success\":true,\"addedCount\":" + addedCount + ",\"repairedCount\":" + repairedCount + "}";
        }

        private string SpawnItem(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            string prefab = ExtractJsonString(json, "prefab");
            int amount = ExtractJsonInt(json, "amount", 1);
            int quality = ExtractJsonInt(json, "quality", 1);

            if (string.IsNullOrEmpty(prefab))
            {
                return "{\"success\":false,\"error\":\"Missing prefab\"}";
            }

            ItemDrop.ItemData added = player.GetInventory().AddItem(prefab, amount, quality, 0, 0, "", true, true);
            if (added != null)
            {
                TriggerInventoryChanged(player.GetInventory());
                player.Message(MessageHud.MessageType.Center, "Spawned: " + prefab + " x" + amount);
                return "{\"success\":true,\"item\":\"" + EscapeJson(prefab) + "\",\"amount\":" + amount + "}";
            }

            return "{\"success\":false,\"error\":\"Inventory full or prefab invalid\"}";
        }

        private string SetBossBuff(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            string power = ExtractJsonString(json, "power");
            if (string.IsNullOrEmpty(power))
            {
                return "{\"success\":false,\"error\":\"Missing power\"}";
            }

            player.SetGuardianPower(power);
            player.m_guardianPowerCooldown = 0f;

            string friendlyName = power.Replace("GP_", "");
            player.Message(MessageHud.MessageType.Center, "Guardian Power: " + friendlyName + " (Ready!)");

            return "{\"success\":true,\"power\":\"" + EscapeJson(power) + "\"}";
        }

        private string RepairAllItems()
        {
            Player player = Player.m_localPlayer;
            if (player == null || player.GetInventory() == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            int count = 0;
            foreach (ItemDrop.ItemData item in player.GetInventory().GetAllItems())
            {
                if (item != null && item.m_shared.m_useDurability)
                {
                    float max = item.GetMaxDurability();
                    if (item.m_durability < max)
                    {
                        item.m_durability = max;
                        count++;
                    }
                }
            }

            TriggerInventoryChanged(player.GetInventory());
            player.Message(MessageHud.MessageType.Center, "Repaired " + count + " items!");
            return "{\"success\":true,\"repairedCount\":" + count + "}";
        }

        private string SetGodMode(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            bool current = player.InGodMode();
            bool target = !current;

            if (!string.IsNullOrEmpty(json))
            {
                if (json.IndexOf("\"enabled\":true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    json.IndexOf("\"enabled\": true", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = true;
                }
                else if (json.IndexOf("\"enabled\":false", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         json.IndexOf("\"enabled\": false", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = false;
                }
            }

            player.SetGodMode(target);
            player.Message(MessageHud.MessageType.Center, "Invincibility (God Mode): " + (target ? "ON" : "OFF"));
            return "{\"success\":true,\"godMode\":" + (target ? "true" : "false") + "}";
        }

        private static FieldInfo _noPlacementCostField;

        private static bool GetNoPlacementCost(Player player)
        {
            if (player == null) return false;
            try
            {
                if (_noPlacementCostField == null)
                {
                    _noPlacementCostField = typeof(Player).GetField("m_noPlacementCost", BindingFlags.Instance | BindingFlags.NonPublic);
                }
                if (_noPlacementCostField != null)
                {
                    return (bool)_noPlacementCostField.GetValue(player);
                }
            }
            catch { }
            return false;
        }

        private static void SetNoPlacementCostValue(Player player, bool enabled)
        {
            if (player == null) return;
            try
            {
                if (_noPlacementCostField == null)
                {
                    _noPlacementCostField = typeof(Player).GetField("m_noPlacementCost", BindingFlags.Instance | BindingFlags.NonPublic);
                }
                if (_noPlacementCostField != null)
                {
                    _noPlacementCostField.SetValue(player, enabled);
                    return;
                }
            }
            catch { }
            if (player.NoCostCheat() != enabled)
            {
                player.NoCostCheat();
            }
        }

        private string SetNoCostMode(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            bool current = GetNoPlacementCost(player);
            bool target = !current;

            if (!string.IsNullOrEmpty(json))
            {
                if (json.IndexOf("\"enabled\":true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    json.IndexOf("\"enabled\": true", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = true;
                }
                else if (json.IndexOf("\"enabled\":false", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         json.IndexOf("\"enabled\": false", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = false;
                }
            }

            SetNoPlacementCostValue(player, target);
            player.Message(MessageHud.MessageType.Center, "No-Cost Building: " + (target ? "ON" : "OFF"));
            return "{\"success\":true,\"noPlacementCost\":" + (target ? "true" : "false") + "}";
        }

        private string SetGhostMode(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            bool current = player.InGhostMode();
            bool target = !current;

            if (!string.IsNullOrEmpty(json))
            {
                if (json.IndexOf("\"enabled\":true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    json.IndexOf("\"enabled\": true", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = true;
                }
                else if (json.IndexOf("\"enabled\":false", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         json.IndexOf("\"enabled\": false", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = false;
                }
            }

            player.SetGhostMode(target);
            player.Message(MessageHud.MessageType.Center, "Ghost Mode: " + (target ? "ON" : "OFF"));
            return "{\"success\":true,\"ghostMode\":" + (target ? "true" : "false") + "}";
        }

        private static FieldInfo _maxAirAltitudeField;
        private static readonly List<Collider> _disabledFlyColliders = new List<Collider>();

        private string SetFlyMode(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            bool current = player.InDebugFlyMode();
            bool target = !current;
            bool noclip = true;

            if (!string.IsNullOrEmpty(json))
            {
                if (json.IndexOf("\"enabled\":true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    json.IndexOf("\"enabled\": true", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = true;
                }
                else if (json.IndexOf("\"enabled\":false", StringComparison.OrdinalIgnoreCase) >= 0 ||
                         json.IndexOf("\"enabled\": false", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    target = false;
                }

                if (json.IndexOf("\"noclip\":false", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    json.IndexOf("\"noclip\": false", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    noclip = false;
                }
            }

            return ApplyFlyMode(player, target, noclip);
        }

        private string ApplyFlyMode(Player player, bool enable, bool noclip)
        {
            if (player == null) return "{\"success\":false,\"error\":\"Player not in game\"}";

            bool current = player.InDebugFlyMode();
            if (current != enable)
            {
                player.ToggleDebugFly();
            }

            if (enable && noclip)
            {
                _disabledFlyColliders.Clear();
                Collider[] cols = player.GetComponentsInChildren<Collider>(true);
                foreach (Collider c in cols)
                {
                    if (c != null && c.enabled)
                    {
                        c.enabled = false;
                        _disabledFlyColliders.Add(c);
                    }
                }

                Rigidbody rb = player.GetComponent<Rigidbody>();
                if (rb != null)
                {
                    rb.detectCollisions = false;
                }

                player.Message(MessageHud.MessageType.Center, "✈ Fly Mode (No-Clip): ON\n[Space] Up | [Ctrl] Down | [Shift] Fast | [F9] Toggle");
            }
            else
            {
                foreach (Collider c in _disabledFlyColliders)
                {
                    if (c != null) c.enabled = true;
                }
                _disabledFlyColliders.Clear();

                Collider mainCol = player.GetComponent<Collider>();
                if (mainCol != null) mainCol.enabled = true;

                Rigidbody rb = player.GetComponent<Rigidbody>();
                if (rb != null)
                {
                    rb.detectCollisions = true;
                    rb.velocity = Vector3.zero;
                }

                // Reset fall altitude so the player lands safely without fall damage
                try
                {
                    if (_maxAirAltitudeField == null)
                    {
                        _maxAirAltitudeField = typeof(Character).GetField("m_maxAirAltitude", BindingFlags.Instance | BindingFlags.NonPublic);
                    }
                    if (_maxAirAltitudeField != null)
                    {
                        _maxAirAltitudeField.SetValue(player, player.transform.position.y);
                    }
                }
                catch { }

                player.Message(MessageHud.MessageType.Center, "✈ Fly Mode: OFF");
            }

            bool isFly = player.InDebugFlyMode();
            return "{\"success\":true,\"flyMode\":" + (isFly ? "true" : "false") + ",\"noclip\":" + (noclip ? "true" : "false") + "}";
        }

        private string ApplyRestedBuff(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            SEMan seMan = player.GetSEMan();
            if (seMan == null)
            {
                return "{\"success\":false,\"error\":\"Status effect manager not found\"}";
            }

            float duration = ExtractJsonFloat(json, "duration", 1500f);
            if (duration <= 0f) duration = 1500f; // Default 25 min (Comfort 18)

            int restedHash = "Rested".GetStableHashCode();
            StatusEffect se = seMan.GetStatusEffect(restedHash);
            if (se == null)
            {
                seMan.AddStatusEffect(restedHash, true);
                se = seMan.GetStatusEffect(restedHash);
            }

            if (se != null)
            {
                se.ResetTime();
                se.m_ttl = duration;
            }

            int minutes = (int)(duration / 60f);
            player.Message(MessageHud.MessageType.Center, "Rested Buff: " + minutes + " min (Comfort 18)");
            return "{\"success\":true,\"duration\":" + duration.ToString("F0") + ",\"isRested\":true}";
        }

        private string TeleportPlayer(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            float x = ExtractJsonFloat(json, "x", float.NaN);
            float y = ExtractJsonFloat(json, "y", float.NaN);
            float z = ExtractJsonFloat(json, "z", float.NaN);

            if (float.IsNaN(x) || float.IsNaN(z))
            {
                return "{\"success\":false,\"error\":\"Missing X or Z coordinate\"}";
            }

            if (float.IsNaN(y) || y == 0f)
            {
                y = player.transform.position.y;
            }

            Vector3 target = new Vector3(x, y + 0.5f, z);
            player.TeleportTo(target, player.transform.rotation, true);
            player.Message(MessageHud.MessageType.Center, "Teleported to (" + x.ToString("F0") + ", " + z.ToString("F0") + ")");
            return "{\"success\":true,\"x\":" + x.ToString("F1") + ",\"y\":" + (y + 0.5f).ToString("F1") + ",\"z\":" + z.ToString("F1") + "}";
        }

        private static List<GameObject> _lastBuildObjects = new List<GameObject>();

        public class BlueprintPiece
        {
            public string prefab;
            public float x;
            public float y;
            public float z;
            public float rx;
            public float ry;
            public float rz;
            public float rw;
            public float scaleX = 1f;
            public float scaleY = 1f;
            public float scaleZ = 1f;
        }

        private static readonly FieldInfo _wntSupportField = typeof(WearNTear).GetField("m_support", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
        private static readonly MethodInfo _wntGetMaxSupportMethod = typeof(WearNTear).GetMethod("GetMaxSupport", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);

        private static readonly MethodInfo _tcLevelTerrainMethod = typeof(TerrainComp).GetMethod(
            "LevelTerrain",
            BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public,
            null,
            new Type[] { typeof(Vector3), typeof(float), typeof(bool) },
            null);

        private static readonly MethodInfo _tcSaveMethod = typeof(TerrainComp).GetMethod(
            "Save",
            BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public,
            null,
            new Type[] { typeof(bool) },
            null);

        private static readonly MethodInfo _tcPaintClearedMethod = typeof(TerrainComp).GetMethod(
            "PaintCleared",
            BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);

        private static readonly Dictionary<string, string> PrefabAliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // Roofs 45
            { "roof_wood_45", "wood_roof_45" },
            { "wood_roof_45", "wood_roof_45" },
            { "woodroof45", "wood_roof_45" },
            { "piece_woodroof45", "wood_roof_45" },
            { "piece_wood_roof_45", "wood_roof_45" },
            { "roof45", "wood_roof_45" },
            { "roof_45", "wood_roof_45" },
            { "roof_wood_ridge_45", "wood_roof_top_45" },
            { "wood_roof_ridge_45", "wood_roof_top_45" },
            { "wood_roof_top_45", "wood_roof_top_45" },
            { "woodrooftop45", "wood_roof_top_45" },
            { "piece_woodrooftop45", "wood_roof_top_45" },
            { "piece_wood_roof_top_45", "wood_roof_top_45" },
            { "piece_woodrooftop_45", "wood_roof_top_45" },
            { "roof_ridge_45", "wood_roof_top_45" },
            { "roof_wood_corner_45", "wood_roof_ocorner_45" },
            { "roof_wood_icorner_45", "wood_roof_icorner_45" },
            { "roof_wood_ocorner_45", "wood_roof_ocorner_45" },
            { "wood_roof_icorner_45", "wood_roof_icorner_45" },
            { "wood_roof_ocorner_45", "wood_roof_ocorner_45" },
            { "woodroof_corner_45", "wood_roof_ocorner_45" },
            { "woodrooficorner45", "wood_roof_icorner_45" },
            { "woodroofocorner45", "wood_roof_ocorner_45" },

            // Roofs 26 (Engine prefab is 'wood_roof', not 'wood_roof_26')
            { "roof_wood_26", "wood_roof" },
            { "wood_roof_26", "wood_roof" },
            { "woodroof26", "wood_roof" },
            { "piece_woodroof26", "wood_roof" },
            { "piece_wood_roof_26", "wood_roof" },
            { "roof26", "wood_roof" },
            { "wood_roof", "wood_roof" },
            { "woodroof", "wood_roof" },
            { "roof_wood_ridge_26", "wood_roof_top" },
            { "wood_roof_ridge_26", "wood_roof_top" },
            { "wood_roof_top_26", "wood_roof_top" },
            { "wood_roof_top", "wood_roof_top" },
            { "woodrooftop26", "wood_roof_top" },
            { "woodrooftop", "wood_roof_top" },
            { "piece_woodrooftop", "wood_roof_top" },
            { "roof_wood_corner_26", "wood_roof_ocorner" },
            { "roof_wood_icorner_26", "wood_roof_icorner" },
            { "roof_wood_ocorner_26", "wood_roof_ocorner" },
            { "wood_roof_ocorner", "wood_roof_ocorner" },
            { "wood_roof_icorner", "wood_roof_icorner" },
            { "woodroof_corner_26", "wood_roof_ocorner" },
            { "woodrooficorner26", "wood_roof_icorner" },
            { "woodroofocorner26", "wood_roof_ocorner" },

            // Darkwood Roofs
            { "darkwood_roof_45", "darkwood_roof_45" },
            { "darkwood_roof_26", "darkwood_roof" },
            { "darkwood_roof", "darkwood_roof" },
            { "darkwood_roof_ridge_45", "darkwood_roof_top_45" },
            { "darkwood_roof_top_45", "darkwood_roof_top_45" },
            { "darkwood_roof_ridge_26", "darkwood_roof_top" },
            { "darkwood_roof_top", "darkwood_roof_top" },

            // Walls & Gables
            { "woodwall", "woodwall" },
            { "piece_woodwall", "woodwall" },
            { "wood_wall", "woodwall" },
            { "woodwall_half", "wood_wall_half" },
            { "wood_wall_half", "wood_wall_half" },
            { "piece_woodwallhalf", "wood_wall_half" },
            { "woodwallhalf", "wood_wall_half" },
            { "woodwall_quarter", "wood_wall_quarter" },
            { "wood_wall_quarter", "wood_wall_quarter" },
            { "piece_woodwallquarter", "wood_wall_quarter" },
            { "woodwallquarter", "wood_wall_quarter" },
            { "woodwall_roof_45", "wood_wall_roof_45" },
            { "wood_wall_roof_45", "wood_wall_roof_45" },
            { "woodwallroof45", "wood_wall_roof_45" },
            { "piece_woodwallroof45", "wood_wall_roof_45" },
            { "woodwall_roof", "wood_wall_roof" },
            { "wood_wall_roof", "wood_wall_roof" },
            { "woodwallroof", "wood_wall_roof" },
            { "piece_woodwallroof", "wood_wall_roof" },
            { "woodwall_rooftop_45", "wood_wall_roof_top_45" },
            { "wood_wall_roof_top_45", "wood_wall_roof_top_45" },
            { "woodwallrooftop45", "wood_wall_roof_top_45" },
            { "piece_woodwallrooftop45", "wood_wall_roof_top_45" },
            { "woodwall_rooftop", "wood_wall_roof_top" },
            { "wood_wall_roof_top", "wood_wall_roof_top" },
            { "woodwallrooftop", "wood_wall_roof_top" },
            { "piece_woodwallrooftop", "wood_wall_roof_top" },

            // Doors & Gates
            { "wood_door", "wood_door" },
            { "wooddoor", "wood_door" },
            { "piece_wooddoor", "wood_door" },
            { "door", "wood_door" },
            { "cloth_door", "piece_cloth_hanging_door_blue" },
            { "clothdoor", "piece_cloth_hanging_door_blue" },
            { "piece_clothdoor", "piece_cloth_hanging_door_blue" },
            { "piece_cloth_hanging_door_blue", "piece_cloth_hanging_door_blue" },
            { "piece_cloth_hanging_door_blue2", "piece_cloth_hanging_door_blue2" },
            { "wood_gate", "wood_gate" },
            { "woodgate", "wood_gate" },
            { "piece_woodgate", "wood_gate" },
            { "gate", "wood_gate" },
            { "darkwood_gate", "darkwood_gate" },
            { "darkwoodgate", "darkwood_gate" },
            { "piece_darkwoodgate", "darkwood_gate" },
            { "iron_gate", "iron_wall_2x2" },

            // Windows & Shutters
            { "wood_window", "wood_window" },
            { "woodwindow", "wood_window" },
            { "wood_window_shutter", "wood_window" },
            { "piece_woodwindowshutter", "wood_window" },
            { "shutter", "wood_window" },

            // Stairs & Ladders
            { "wood_stair", "wood_stair" },
            { "woodstair", "wood_stair" },
            { "woodstairs", "wood_stair" },
            { "piece_woodstair", "wood_stair" },
            { "wood_stepladder", "wood_stepladder" },
            { "woodstepladder", "wood_stepladder" },
            { "piece_woodstepladder", "wood_stepladder" },
            { "ladder", "wood_stepladder" },
            { "stepladder", "wood_stepladder" },

            // Iron Grates & Floors
            { "iron_wall_2x2", "iron_wall_2x2" },
            { "iron_wall", "iron_wall_2x2" },
            { "ironwall", "iron_wall_2x2" },
            { "piece_ironwall", "iron_wall_2x2" },
            { "iron_wall_1x1", "iron_wall_1x1" },
            { "ironwallsmall", "iron_wall_1x1" },
            { "piece_ironwallSmall", "iron_wall_1x1" },
            { "iron_floor_2x2", "iron_floor_2x2" },
            { "iron_floor", "iron_floor_2x2" },
            { "ironfloor", "iron_floor_2x2" },
            { "piece_ironfloor", "iron_floor_2x2" },
            { "iron_floor_1x1", "iron_floor_1x1" },
            { "ironfloorsmall", "iron_floor_1x1" },
            { "piece_ironfloorSmall", "iron_floor_1x1" },

            // Inverted Roof Gables
            { "wood_wall_roof_upsidedown", "wood_wall_roof_upsidedown" },
            { "woodwallroof_upsidedown", "wood_wall_roof_upsidedown" },
            { "piece_woodwallroof_upsidedown", "wood_wall_roof_upsidedown" },
            { "wood_wall_roof_45_upsidedown", "wood_wall_roof_45_upsidedown" },
            { "woodwallroof45_upsidedown", "wood_wall_roof_45_upsidedown" },
            { "piece_woodwallroof45_upsidedown", "wood_wall_roof_45_upsidedown" },

            // Floors
            { "woodfloor", "wood_floor" },
            { "piece_woodfloor", "wood_floor" },
            { "wood_floor", "wood_floor" },
            { "woodfloor2x2", "wood_floor" },
            { "woodfloor_2x2", "wood_floor" },
            { "wood_floor_2x2", "wood_floor" },
            { "piece_woodfloor2x2", "wood_floor" },
            { "piece_woodfloor_2x2", "wood_floor" },
            { "woodfloor1x1", "wood_floor_1x1" },
            { "woodfloor_1x1", "wood_floor_1x1" },
            { "wood_floor_1x1", "wood_floor_1x1" },
            { "piece_woodfloor1x1", "wood_floor_1x1" },
            { "piece_woodfloor_1x1", "wood_floor_1x1" },

            // Stone Structures (Canonical names are stone_*)
            { "stonewall4x2", "stone_wall_4x2" },
            { "piece_stonewall4x2", "stone_wall_4x2" },
            { "stone_wall_4x2", "stone_wall_4x2" },
            { "stonewall_4x2", "stone_wall_4x2" },
            { "piece_stone_wall_4x2", "stone_wall_4x2" },
            { "stonewall2x1", "stone_wall_2x1" },
            { "piece_stonewall2x1", "stone_wall_2x1" },
            { "stone_wall_2x1", "stone_wall_2x1" },
            { "stonewall_2x1", "stone_wall_2x1" },
            { "piece_stone_wall_2x1", "stone_wall_2x1" },
            { "stonewall1x1", "stone_wall_1x1" },
            { "piece_stonewall1x1", "stone_wall_1x1" },
            { "stone_wall_1x1", "stone_wall_1x1" },
            { "stonewall_1x1", "stone_wall_1x1" },
            { "piece_stone_wall_1x1", "stone_wall_1x1" },
            { "stonefloor2x2", "stone_floor_2x2" },
            { "piece_stonefloor2x2", "stone_floor_2x2" },
            { "stone_floor_2x2", "stone_floor_2x2" },
            { "stonefloor_2x2", "stone_floor_2x2" },
            { "piece_stone_floor_2x2", "stone_floor_2x2" },
            { "stonefloor", "stone_floor" },
            { "stone_floor", "stone_floor" },
            { "stonefloor4x4", "stone_floor_4x4" },
            { "piece_stonefloor4x4", "stone_floor_4x4" },
            { "stone_floor_4x4", "stone_floor_4x4" },
            { "stonefloor_4x4", "stone_floor_4x4" },
            { "stonearch", "stone_arch" },
            { "piece_stonearch", "stone_arch" },
            { "stone_arch", "stone_arch" },
            { "piece_stone_arch", "stone_arch" },
            { "stonestair", "stone_stair" },
            { "piece_stonestair", "stone_stair" },
            { "stonestairs", "stone_stair" },
            { "piece_stonestairs", "stone_stair" },
            { "stone_stairs", "stone_stair" },
            { "piece_stone_stairs", "stone_stair" },
            { "stone_stair", "stone_stair" },
            { "stonepillar", "stone_pillar" },
            { "piece_stonepillar", "stone_pillar" },
            { "stone_pillar", "stone_pillar" },

            // Wood Beams & Poles
            { "woodbeam26", "wood_beam_26" },
            { "woodbeam_26", "wood_beam_26" },
            { "wood_beam_26", "wood_beam_26" },
            { "piece_woodbeam26", "wood_beam_26" },
            { "woodbeam45", "wood_beam_45" },
            { "woodbeam_45", "wood_beam_45" },
            { "wood_beam_45", "wood_beam_45" },
            { "piece_woodbeam45", "wood_beam_45" },
            { "woodbeam1", "wood_beam_1" },
            { "woodbeam_1", "wood_beam_1" },
            { "wood_beam_1", "wood_beam_1" },
            { "piece_woodbeam1", "wood_beam_1" },
            { "woodbeam2", "wood_beam" },
            { "woodbeam_2", "wood_beam" },
            { "woodbeam", "wood_beam" },
            { "wood_beam", "wood_beam" },
            { "piece_woodbeam", "wood_beam" },
            { "piece_woodbeam2", "wood_beam" },
            { "woodpole", "wood_pole" },
            { "wood_pole", "wood_pole" },
            { "piece_woodpole", "wood_pole" },
            { "woodpole2", "wood_pole2" },
            { "woodpole_2", "wood_pole2" },
            { "wood_pole2", "wood_pole2" },
            { "piece_woodpole2", "wood_pole2" },
            { "piece_woodpole_2", "wood_pole2" },
            { "logbeam2", "wood_wall_log" },
            { "logbeam_2", "wood_wall_log" },
            { "piece_logbeam2", "wood_wall_log" },
            { "piece_logbeam_2", "wood_wall_log" },
            { "logbeam4", "wood_wall_log_4x0.5" },
            { "logbeam_4", "wood_wall_log_4x0.5" },
            { "piece_logbeam4", "wood_wall_log_4x0.5" },
            { "piece_logbeam_4", "wood_wall_log_4x0.5" },
            { "logpole2", "wood_pole_log" },
            { "logpole_2", "wood_pole_log" },
            { "wood_pole_log", "wood_pole_log" },
            { "piece_logpole2", "wood_pole_log" },
            { "piece_logpole_2", "wood_pole_log" },
            { "logpole4", "wood_pole_log_4" },
            { "logpole_4", "wood_pole_log_4" },
            { "wood_pole_log_4", "wood_pole_log_4" },
            { "piece_logpole4", "wood_pole_log_4" },
            { "piece_logpole_4", "wood_pole_log_4" },

            // Stations & Utilities
            { "workbench", "piece_workbench" },
            { "piece_workbench", "piece_workbench" },
            { "forge", "forge" },
            { "piece_forge", "forge" },
            { "smelter", "smelter" },
            { "piece_smelter", "smelter" },
            { "blastfurnace", "blastfurnace" },
            { "piece_blastfurnace", "blastfurnace" },
            { "fermenter", "fermenter" },
            { "piece_fermenter", "fermenter" },
            { "charcoalkiln", "charcoal_kiln" },
            { "charcoal_kiln", "charcoal_kiln" },
            { "piece_charcoalkiln", "charcoal_kiln" },
            { "kiln", "charcoal_kiln" },
            { "cartographytable", "piece_cartographytable" },
            { "cartography_table", "piece_cartographytable" },
            { "piece_cartographytable", "piece_cartographytable" },
            { "spinningwheel", "spinningwheel" },
            { "piece_spinningwheel", "spinningwheel" },
            { "windmill", "windmill" },
            { "piece_windmill", "windmill" },
            { "stonecutter", "piece_stonecutter" },
            { "piece_stonecutter", "piece_stonecutter" },

            // Hearth & Fire
            { "hearth", "hearth" },
            { "piece_hearth", "hearth" },
            { "firepit", "fire_pit" },
            { "fire_pit", "fire_pit" },
            { "piece_firepit", "fire_pit" },
            { "bonfire", "bonfire" },
            { "piece_bonfire", "bonfire" },
            { "firepit_iron", "firepit_iron" },
            { "iron_firepit", "firepit_iron" },
            { "piece_firepit_iron", "firepit_iron" },

            // Furniture & Lights
            { "bed", "bed" },
            { "piece_bed", "bed" },
            { "bed02", "piece_bed02" },
            { "piece_bed02", "piece_bed02" },
            { "chair", "piece_chair" },
            { "piece_chair", "piece_chair" },
            { "darkwoodchair", "piece_chair03" },
            { "table", "piece_table" },
            { "piece_table", "piece_table" },
            { "table_round", "piece_table_round" },
            { "table_oak", "piece_table_oak" },
            { "standing_wood_torch", "piece_groundtorch_wood" },
            { "groundtorchwood", "piece_groundtorch_wood" },
            { "piece_groundtorchwood", "piece_groundtorch_wood" },
            { "piece_groundtorch_wood", "piece_groundtorch_wood" },
            { "standing_green_torch", "piece_groundtorch_green" },
            { "groundtorchgreen", "piece_groundtorch_green" },
            { "piece_groundtorchgreen", "piece_groundtorch_green" },
            { "piece_groundtorch_green", "piece_groundtorch_green" },
            { "standing_blue_torch", "piece_groundtorch_blue" },
            { "groundtorchblue", "piece_groundtorch_blue" },
            { "piece_groundtorchblue", "piece_groundtorch_blue" },
            { "piece_groundtorch_blue", "piece_groundtorch_blue" },
            { "standing_iron_torch", "piece_groundtorch" },
            { "groundtorch", "piece_groundtorch" },
            { "piece_groundtorch", "piece_groundtorch" },
            { "portal", "portal" },
            { "piece_portal", "portal" },
            { "portal_wood", "portal_wood" },
            { "portal_stone", "portal_stone" },
            { "piece_portal_stone", "portal_stone" },

            // Chests
            { "chest", "piece_chest_wood" },
            { "wood_chest", "piece_chest_wood" },
            { "chest_wood", "piece_chest_wood" },
            { "piece_chestwood", "piece_chest_wood" },
            { "piece_chest_wood", "piece_chest_wood" },
            { "reinforced_chest", "piece_chest" },
            { "iron_chest", "piece_chest" },
            { "ironchest", "piece_chest" },
            { "piece_chest", "piece_chest" },
            { "blackmetal_chest", "piece_chest_blackmetal" },
            { "piece_chestblackmetal", "piece_chest_blackmetal" },
            { "piece_chest_blackmetal", "piece_chest_blackmetal" },
        };

        private static readonly Dictionary<string, GameObject> _prefabsByName = new Dictionary<string, GameObject>(StringComparer.OrdinalIgnoreCase);
        private static readonly Dictionary<string, GameObject> _prefabsByNorm = new Dictionary<string, GameObject>(StringComparer.OrdinalIgnoreCase);

        private static string NormalizePrefabKey(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            string lower = s.ToLowerInvariant().Trim();
            if (lower.StartsWith("piece_")) lower = lower.Substring(6);
            else if (lower.StartsWith("piece")) lower = lower.Substring(5);
            return lower.Replace("_", "").Replace(" ", "");
        }

        private static void EnsurePrefabCache()
        {
            if (_prefabsByName.Count > 0) return;

            if (ZNetScene.instance != null && ZNetScene.instance.m_prefabs != null)
            {
                foreach (GameObject go in ZNetScene.instance.m_prefabs)
                {
                    if (go == null) continue;
                    string name = go.name;
                    if (!_prefabsByName.ContainsKey(name)) _prefabsByName[name] = go;
                    string norm = NormalizePrefabKey(name);
                    if (!_prefabsByNorm.ContainsKey(norm)) _prefabsByNorm[norm] = go;
                }
            }

            if (ObjectDB.instance != null)
            {
                try
                {
                    List<Piece> pieces = ObjectDB.instance.GetAllBuildPieces();
                    if (pieces != null)
                    {
                        foreach (Piece piece in pieces)
                        {
                            if (piece == null || piece.gameObject == null) continue;
                            GameObject go = piece.gameObject;
                            string name = go.name;
                            if (!_prefabsByName.ContainsKey(name)) _prefabsByName[name] = go;
                            string norm = NormalizePrefabKey(name);
                            if (!_prefabsByNorm.ContainsKey(norm)) _prefabsByNorm[norm] = go;
                        }
                    }
                }
                catch { }

                try
                {
                    if (ObjectDB.instance.m_items != null)
                    {
                        foreach (GameObject go in ObjectDB.instance.m_items)
                        {
                            if (go == null) continue;
                            string name = go.name;
                            if (!_prefabsByName.ContainsKey(name)) _prefabsByName[name] = go;
                            string norm = NormalizePrefabKey(name);
                            if (!_prefabsByNorm.ContainsKey(norm)) _prefabsByNorm[norm] = go;
                        }
                    }
                }
                catch { }
            }
        }

        private GameObject FindBuildingPrefab(string name)
        {
            if (string.IsNullOrEmpty(name)) return null;

            string clean = name.Trim();
            if (clean.EndsWith("(Clone)")) clean = clean.Substring(0, clean.Length - 7).Trim();

            // 1. Direct match from ZNetScene
            if (ZNetScene.instance != null)
            {
                GameObject direct = ZNetScene.instance.GetPrefab(clean);
                if (direct != null) return direct;
            }

            EnsurePrefabCache();

            // 2. Direct cache lookup (case insensitive)
            GameObject cached;
            if (_prefabsByName.TryGetValue(clean, out cached)) return cached;

            // 3. Known Aliases table
            string mapped;
            if (PrefabAliases.TryGetValue(clean, out mapped))
            {
                if (ZNetScene.instance != null)
                {
                    GameObject direct = ZNetScene.instance.GetPrefab(mapped);
                    if (direct != null) return direct;
                }
                if (_prefabsByName.TryGetValue(mapped, out cached)) return cached;
                string normMapped = NormalizePrefabKey(mapped);
                if (_prefabsByNorm.TryGetValue(normMapped, out cached)) return cached;
            }

            // 4. Normalized lookup (strips "piece_", spaces, and underscores)
            string norm = NormalizePrefabKey(clean);
            if (_prefabsByNorm.TryGetValue(norm, out cached)) return cached;

            // 5. Try stripping "piece_" prefix directly
            string stripped = clean.ToLowerInvariant();
            if (stripped.StartsWith("piece_")) stripped = stripped.Substring(6);
            else if (stripped.StartsWith("piece")) stripped = stripped.Substring(5);

            if (_prefabsByName.TryGetValue(stripped, out cached)) return cached;

            if (PrefabAliases.TryGetValue(stripped, out mapped))
            {
                if (_prefabsByName.TryGetValue(mapped, out cached)) return cached;
                if (_prefabsByNorm.TryGetValue(NormalizePrefabKey(mapped), out cached)) return cached;
            }

            // 6. Try prepending "piece_" directly
            if (_prefabsByName.TryGetValue("piece_" + stripped, out cached)) return cached;

            // 7. Try prepending "wood_" or "stone_" if missing
            if (_prefabsByName.TryGetValue("wood_" + stripped, out cached)) return cached;
            if (_prefabsByName.TryGetValue("stone_" + stripped, out cached)) return cached;

            // 8. Fallback loop over ZNetScene.m_prefabs
            if (ZNetScene.instance != null && ZNetScene.instance.m_prefabs != null)
            {
                foreach (GameObject p in ZNetScene.instance.m_prefabs)
                {
                    if (p == null) continue;
                    string pNorm = NormalizePrefabKey(p.name);
                    if (pNorm == norm) return p;
                }
            }

            return null;
        }

        private Vector3 GetAimPlacementPosition(Player player, float heightOffset, float fallbackDist)
        {
            Transform cam = Camera.main != null ? Camera.main.transform : null;
            Vector3 rayOrigin = cam != null ? cam.position : (player.transform.position + Vector3.up * 1.5f);
            Vector3 rayDir = cam != null ? cam.forward : player.transform.forward;

            int mask = LayerMask.GetMask("Default", "static_solid", "Default_small", "piece", "terrain");
            RaycastHit hit;
            if (Physics.Raycast(rayOrigin, rayDir, out hit, 60f, mask))
            {
                return hit.point + new Vector3(0f, heightOffset, 0f);
            }

            Vector3 flatDir = new Vector3(rayDir.x, 0f, rayDir.z).normalized;
            if (flatDir.sqrMagnitude < 0.001f) flatDir = player.transform.forward;
            return player.transform.position + (flatDir * fallbackDist) + new Vector3(0f, heightOffset, 0f);
        }

        private Quaternion GetAimPlacementRotation(Player player, float additionalYaw)
        {
            Transform cam = Camera.main != null ? Camera.main.transform : null;
            Vector3 rayDir = cam != null ? cam.forward : player.transform.forward;
            Vector3 flatDir = new Vector3(rayDir.x, 0f, rayDir.z).normalized;
            if (flatDir.sqrMagnitude < 0.001f) flatDir = player.transform.forward;

            float camYaw = Mathf.Atan2(flatDir.x, flatDir.z) * Mathf.Rad2Deg;
            float totalYaw = (camYaw + additionalYaw) % 360f;
            return Quaternion.Euler(0f, totalYaw, 0f);
        }

        private int InstantiatePieces(List<BlueprintPiece> pieces, Vector3 basePos, Quaternion baseRot, string name)
        {
            Player player = Player.m_localPlayer;
            if (player == null || pieces == null || pieces.Count == 0) return 0;
            if (ZNetScene.instance == null) return 0;

            _lastBuildObjects.Clear();

            // Sort pieces by Y elevation ascending (bottom-to-top) so ground/foundations/walls instantiate before roofs
            try
            {
                pieces.Sort((a, b) => a.y.CompareTo(b.y));
            }
            catch { }

            int placedCount = 0;
            foreach (BlueprintPiece p in pieces)
            {
                if (string.IsNullOrEmpty(p.prefab)) continue;
                string cleanPrefab = p.prefab.Trim();
                if (cleanPrefab.IndexOf(';') >= 0) cleanPrefab = cleanPrefab.Split(';')[0].Trim();
                if (cleanPrefab.IndexOf('(') >= 0) cleanPrefab = cleanPrefab.Split('(')[0].Trim();

                GameObject prefab = FindBuildingPrefab(cleanPrefab);
                if (prefab == null)
                {
                    Logger.LogWarning("AutoBuilder: could not find prefab for piece '" + cleanPrefab + "'");
                    continue;
                }

                Vector3 pieceLocalPos = new Vector3(p.x, p.y, p.z);
                Quaternion pieceLocalRot = (p.rw == 0f && p.rx == 0f && p.ry == 0f && p.rz == 0f)
                    ? Quaternion.identity
                    : new Quaternion(p.rx, p.ry, p.rz, p.rw);

                Vector3 worldPos = basePos + (baseRot * pieceLocalPos);
                Quaternion worldRot = baseRot * pieceLocalRot;

                try
                {
                    GameObject instance = UnityEngine.Object.Instantiate(prefab, worldPos, worldRot);
                    if (instance != null)
                    {
                        Piece pieceComp = instance.GetComponent<Piece>();
                        if (pieceComp != null)
                        {
                            try { pieceComp.SetCreator(player.GetPlayerID(), PlatformManager.DistributionPlatform.LocalUser.PlatformUserID); } catch { }
                            try { pieceComp.OnPlaced(); } catch { }
                        }

                        WearNTear wnt = instance.GetComponent<WearNTear>();
                        if (wnt != null)
                        {
                            try
                            {
                                wnt.m_noSupportWear = true;
                                wnt.m_noRoofWear = true;
                                if (_wntSupportField != null && _wntGetMaxSupportMethod != null)
                                {
                                    float maxSupport = (float)_wntGetMaxSupportMethod.Invoke(wnt, null);
                                    _wntSupportField.SetValue(wnt, maxSupport);
                                }
                            }
                            catch { }
                        }

                        _lastBuildObjects.Add(instance);
                        placedCount++;
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogWarning("Failed to instantiate " + cleanPrefab + ": " + ex.Message);
                }
            }

            return placedCount;
        }

        private List<BlueprintPiece> ParseBlueprintText(string content)
        {
            List<BlueprintPiece> list = new List<BlueprintPiece>();
            if (string.IsNullOrEmpty(content)) return list;

            if (content.TrimStart().StartsWith("{") || content.Contains("\"pieces\""))
            {
                return ParseBlueprintPieces(content);
            }

            using (StringReader sr = new StringReader(content))
            {
                string line;
                bool inPieces = false;
                bool hasPiecesHeader = content.Contains("#Pieces");
                while ((line = sr.ReadLine()) != null)
                {
                    line = line.Trim();
                    if (string.IsNullOrEmpty(line)) continue;
                    if (line.StartsWith("#Pieces", StringComparison.OrdinalIgnoreCase))
                    {
                        inPieces = true;
                        continue;
                    }
                    if (line.StartsWith("#"))
                    {
                        if (inPieces) inPieces = false;
                        continue;
                    }

                    if (inPieces || (!hasPiecesHeader && line.Contains(";")))
                    {
                        string[] parts = line.Split(';');
                        if (parts.Length >= 5)
                        {
                            string prefabName = parts[0].Trim();
                            if (string.IsNullOrEmpty(prefabName)) continue;
                            float dummy;
                            if (float.TryParse(prefabName.Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out dummy))
                            {
                                // Skip numerical lines (e.g. snappoints)
                                continue;
                            }

                            BlueprintPiece p = new BlueprintPiece();
                            p.prefab = prefabName;
                            float.TryParse(parts[2].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out p.x);
                            float.TryParse(parts[3].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out p.y);
                            float.TryParse(parts[4].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out p.z);
                            if (parts.Length >= 9)
                            {
                                float.TryParse(parts[5].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out p.rx);
                                float.TryParse(parts[6].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out p.ry);
                                float.TryParse(parts[7].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out p.rz);
                                float.TryParse(parts[8].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out p.rw);
                            }
                            else
                            {
                                p.rw = 1f;
                            }
                            list.Add(p);
                        }
                    }
                }
            }
            return list;
        }

        private string BuildBlueprint(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }
            if (ZNetScene.instance == null)
            {
                return "{\"success\":false,\"error\":\"ZNetScene not available (world not loaded)\"}";
            }

            string name = ExtractJsonString(json, "name");
            if (string.IsNullOrEmpty(name)) name = "Structure";

            float rotationY = ExtractJsonFloat(json, "rotationY", 0f);
            float heightOffset = ExtractJsonFloat(json, "heightOffset", 0f);
            float distanceInFront = ExtractJsonFloat(json, "distanceInFront", 6f);
            bool usePlayerPos = json.IndexOf("\"usePlayerPos\":false", StringComparison.OrdinalIgnoreCase) < 0 &&
                                json.IndexOf("\"usePlayerPos\": false", StringComparison.OrdinalIgnoreCase) < 0;

            float originX = ExtractJsonFloat(json, "originX", float.NaN);
            float originY = ExtractJsonFloat(json, "originY", float.NaN);
            float originZ = ExtractJsonFloat(json, "originZ", float.NaN);

            Vector3 basePos;
            Quaternion baseRot;

            if (usePlayerPos || float.IsNaN(originX) || float.IsNaN(originZ))
            {
                basePos = GetAimPlacementPosition(player, heightOffset, distanceInFront);
                baseRot = GetAimPlacementRotation(player, rotationY);
            }
            else
            {
                float y = float.IsNaN(originY) ? player.transform.position.y : originY;
                basePos = new Vector3(originX, y + heightOffset, originZ);
                baseRot = Quaternion.Euler(0f, rotationY, 0f);
            }

            List<BlueprintPiece> pieces = ParseBlueprintText(json);
            if (pieces == null || pieces.Count == 0)
            {
                return "{\"success\":false,\"error\":\"No valid pieces in blueprint payload\"}";
            }

            bool autoTerraform = ExtractJsonBool(json, "autoTerraform", true);
            if (autoTerraform)
            {
                float margin = ExtractJsonFloat(json, "margin", 1.2f);
                TerraformGroundUnderStructure(pieces, basePos, baseRot, margin);
            }

            int placedCount = InstantiatePieces(pieces, basePos, baseRot, name);
            player.Message(MessageHud.MessageType.Center, "★ Built: " + name + " (" + placedCount + " pieces)!\nPress [F8] or [Ctrl+Z] to Undo");

            return "{\"success\":true,\"placedCount\":" + placedCount + ",\"totalPieces\":" + pieces.Count + ",\"name\":\"" + EscapeJson(name) + "\"}";
        }

        private string CaptureBlueprint(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            float radius = ExtractJsonFloat(json, "radius", 15.0f);
            if (radius < 1f) radius = 1f;
            if (radius > 150f) radius = 150f;

            string name = ExtractJsonString(json, "name");
            if (string.IsNullOrEmpty(name))
            {
                name = "Capture_" + DateTime.Now.ToString("yyyyMMdd_HHmmss");
            }
            char[] invalidChars = Path.GetInvalidFileNameChars();
            foreach (char c in invalidChars) name = name.Replace(c, '_');
            name = name.Trim();

            bool saveToDisk = ExtractJsonBool(json, "saveToDisk", true);

            // Determine capture center
            Vector3 center = player.transform.position;
            Transform cam = Camera.main != null ? Camera.main.transform : null;
            if (cam != null)
            {
                int mask = LayerMask.GetMask("piece", "Default", "static_solid");
                RaycastHit hit;
                if (Physics.Raycast(cam.position, cam.forward, out hit, 40f, mask))
                {
                    Piece hitPiece = hit.collider.GetComponentInParent<Piece>();
                    if (hitPiece != null)
                    {
                        center = hitPiece.transform.position;
                    }
                    else
                    {
                        center = hit.point;
                    }
                }
            }

            float explicitX = ExtractJsonFloat(json, "x", float.NaN);
            float explicitY = ExtractJsonFloat(json, "y", float.NaN);
            float explicitZ = ExtractJsonFloat(json, "z", float.NaN);
            if (!float.IsNaN(explicitX) && !float.IsNaN(explicitZ))
            {
                center = new Vector3(explicitX, float.IsNaN(explicitY) ? player.transform.position.y : explicitY, explicitZ);
            }

            List<Piece> rawPieces = new List<Piece>();
            Piece.GetAllPiecesInRadius(center, radius, rawPieces);

            if (rawPieces.Count == 0)
            {
                float rSq = radius * radius;
                Piece[] all = UnityEngine.Object.FindObjectsOfType<Piece>();
                if (all != null)
                {
                    foreach (Piece p in all)
                    {
                        if (p != null && (p.transform.position - center).sqrMagnitude <= rSq)
                        {
                            rawPieces.Add(p);
                        }
                    }
                }
            }

            if (rawPieces.Count == 0)
            {
                player.Message(MessageHud.MessageType.Center, "No pieces found within " + radius.ToString("F1") + "m of capture point.");
                return "{\"success\":false,\"error\":\"No pieces found within radius " + radius.ToString("F1") + "m\"}";
            }

            List<Piece> validPieces = new List<Piece>();
            HashSet<int> seenInstanceIds = new HashSet<int>();

            foreach (Piece p in rawPieces)
            {
                if (p == null || p.gameObject == null) continue;
                int id = p.gameObject.GetInstanceID();
                if (seenInstanceIds.Contains(id)) continue;
                seenInstanceIds.Add(id);

                if (p.gameObject.name.IndexOf("ValheimLiveBridge", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (p.gameObject.name.IndexOf("piece_blueprint", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (p.transform.parent != null && p.transform.parent.name.IndexOf("Hologram", StringComparison.OrdinalIgnoreCase) >= 0) continue;

                string prefabName = global::Utils.GetPrefabName(p.gameObject);
                if (string.IsNullOrEmpty(prefabName)) continue;
                if (prefabName.IndexOf("piece_blueprint", StringComparison.OrdinalIgnoreCase) >= 0) continue;

                validPieces.Add(p);
            }

            if (validPieces.Count == 0)
            {
                player.Message(MessageHud.MessageType.Center, "No valid player building pieces found to capture.");
                return "{\"success\":false,\"error\":\"No valid pieces to capture\"}";
            }

            // Compute bounding box
            float minX = float.MaxValue, minY = float.MaxValue, minZ = float.MaxValue;
            float maxX = float.MinValue, maxY = float.MinValue, maxZ = float.MinValue;

            foreach (Piece p in validPieces)
            {
                Vector3 pos = p.transform.position;
                if (pos.x < minX) minX = pos.x;
                if (pos.y < minY) minY = pos.y;
                if (pos.z < minZ) minZ = pos.z;
                if (pos.x > maxX) maxX = pos.x;
                if (pos.y > maxY) maxY = pos.y;
                if (pos.z > maxZ) maxZ = pos.z;
            }

            Vector3 anchor = new Vector3((minX + maxX) * 0.5f, minY, (minZ + maxZ) * 0.5f);

            StringBuilder blueprintText = new StringBuilder();
            string playerName = player.GetPlayerName();
            if (string.IsNullOrEmpty(playerName)) playerName = "Viking";

            blueprintText.AppendLine("#Name:" + name);
            blueprintText.AppendLine("#Creator:" + playerName);
            blueprintText.AppendLine("#Description:Captured live at (" + center.x.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) + ", " + center.y.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) + ", " + center.z.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) + ") with radius " + radius.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) + "m");
            blueprintText.AppendLine("#Category:Captured");
            blueprintText.AppendLine("#Pieces");

            StringBuilder jsonPieces = new StringBuilder();
            jsonPieces.Append("[");

            Dictionary<string, int> pieceCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            for (int i = 0; i < validPieces.Count; i++)
            {
                Piece p = validPieces[i];
                string prefab = global::Utils.GetPrefabName(p.gameObject);
                if (pieceCounts.ContainsKey(prefab)) pieceCounts[prefab]++;
                else pieceCounts[prefab] = 1;

                Vector3 relPos = p.transform.position - anchor;
                Quaternion rot = p.transform.rotation;
                Vector3 scale = p.transform.lossyScale;

                string info = "";
                Sign sign = p.GetComponent<Sign>();
                if (sign != null)
                {
                    string sText = sign.GetText();
                    if (!string.IsNullOrEmpty(sText))
                    {
                        byte[] bytes = System.Text.Encoding.UTF8.GetBytes(sText);
                        info = Convert.ToBase64String(bytes);
                    }
                }

                blueprintText.AppendLine(string.Format(System.Globalization.CultureInfo.InvariantCulture,
                    "{0};Building;{1:F3};{2:F3};{3:F3};{4:F4};{5:F4};{6:F4};{7:F4};{8};{9:F2};{10:F2};{11:F2}",
                    prefab, relPos.x, relPos.y, relPos.z, rot.x, rot.y, rot.z, rot.w, info, scale.x, scale.y, scale.z));

                if (i > 0) jsonPieces.Append(",");
                jsonPieces.Append(string.Format(System.Globalization.CultureInfo.InvariantCulture,
                    "{{\"prefab\":\"{0}\",\"x\":{1:F3},\"y\":{2:F3},\"z\":{3:F3},\"rx\":{4:F4},\"ry\":{5:F4},\"rz\":{6:F4},\"rw\":{7:F4},\"scaleX\":{8:F2},\"scaleY\":{9:F2},\"scaleZ\":{10:F2}}}",
                    prefab, relPos.x, relPos.y, relPos.z, rot.x, rot.y, rot.z, rot.w, scale.x, scale.y, scale.z));
            }
            jsonPieces.Append("]");

            string savedPath = "";
            if (saveToDisk)
            {
                try
                {
                    string dir = GetPlanBuildDir();
                    savedPath = Path.Combine(dir, name + ".blueprint");
                    File.WriteAllText(savedPath, blueprintText.ToString());
                    NotifyPlanBuildReload();
                }
                catch (Exception ex)
                {
                    Logger.LogWarning("Failed saving captured blueprint to disk: " + ex.Message);
                }
            }

            player.Message(MessageHud.MessageType.Center,
                "★ CAPTURED: " + name + "!\n" +
                validPieces.Count + " pieces captured within " + radius.ToString("F1") + "m radius." +
                (string.IsNullOrEmpty(savedPath) ? "" : "\nSaved to PlanBuild/blueprints"));

            StringBuilder breakdownJson = new StringBuilder();
            breakdownJson.Append("{");
            int bCount = 0;
            foreach (var kvp in pieceCounts)
            {
                if (bCount > 0) breakdownJson.Append(",");
                breakdownJson.Append("\"" + EscapeJson(kvp.Key) + "\":" + kvp.Value);
                bCount++;
            }
            breakdownJson.Append("}");

            return "{\"success\":true,\"name\":\"" + EscapeJson(name) + "\",\"piecesCount\":" + validPieces.Count +
                   ",\"radius\":" + radius.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) +
                   ",\"savedPath\":\"" + EscapeJson(savedPath) + "\"" +
                   ",\"pieces\":" + jsonPieces.ToString() +
                   ",\"pieceCounts\":" + breakdownJson.ToString() +
                   ",\"rawBlueprint\":\"" + EscapeJson(blueprintText.ToString()) + "\"}";
        }

        private string ArmBlueprint(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            _armedPieces = ParseBlueprintText(json);
            if (_armedPieces == null || _armedPieces.Count == 0)
            {
                return "{\"success\":false,\"error\":\"No valid pieces in blueprint payload\"}";
            }

            _armedBlueprintName = ExtractJsonString(json, "name");
            if (string.IsNullOrEmpty(_armedBlueprintName)) _armedBlueprintName = "Structure";

            _autoTerraform = ExtractJsonBool(json, "autoTerraform", true);
            _armedRotationY = ExtractJsonFloat(json, "rotationY", 0f);
            _armedHeightOffset = ExtractJsonFloat(json, "heightOffset", 0f);
            _isArmed = true;

            // Spawn 3D Ghost Hologram immediately
            SpawnHologram(_armedPieces);

            player.Message(MessageHud.MessageType.Center,
                "★ 3D HOLOGRAM ACTIVE: " + _armedBlueprintName + " (" + _armedPieces.Count + " pcs)\n" +
                "[Scroll] Rotate | [Ctrl+Scroll] Elevation | [T] Auto-Flatten: " + (_autoTerraform ? "ON" : "OFF") + "\n" +
                "[Left-Click] / [G] Place | [Right-Click] / [Esc] Cancel");

            return "{\"success\":true,\"name\":\"" + EscapeJson(_armedBlueprintName) + "\",\"piecesCount\":" + _armedPieces.Count + "}";
        }

        private string DisarmBlueprint()
        {
            _isArmed = false;
            _armedPieces = null;
            DestroyHologram();
            Player player = Player.m_localPlayer;
            if (player != null)
            {
                player.Message(MessageHud.MessageType.TopLeft, "Blueprint Placement Cancelled.");
            }
            return "{\"success\":true}";
        }

        private static void DestroyHologram()
        {
            if (_hologramRoot != null)
            {
                try
                {
                    UnityEngine.Object.Destroy(_hologramRoot);
                }
                catch { }
                _hologramRoot = null;
            }
        }

        private void SpawnHologram(List<BlueprintPiece> pieces)
        {
            DestroyHologram();

            if (pieces == null || pieces.Count == 0) return;
            Player player = Player.m_localPlayer;
            if (player == null) return;

            EnsurePrefabCache();

            _hologramRoot = new GameObject("ValheimLiveBridge_Hologram");
            _hologramRoot.transform.position = player.transform.position + player.transform.forward * 6f;
            _hologramRoot.transform.rotation = Quaternion.Euler(0f, _armedRotationY, 0f);

            int ghostLayer = LayerMask.NameToLayer("ghost");
            if (ghostLayer < 0) ghostLayer = 14;

            // Suppress network init and terrain ops for ghost clones
            ZNetView.m_forceDisableInit = true;
            TerrainOp.m_forceDisableTerrainOps = true;

            try
            {
                Dictionary<string, GameObject> localPrefabs = new Dictionary<string, GameObject>(StringComparer.OrdinalIgnoreCase);
                foreach (BlueprintPiece bp in pieces)
                {
                    if (string.IsNullOrEmpty(bp.prefab)) continue;
                    string clean = bp.prefab.Trim();
                    if (clean.IndexOf(';') >= 0) clean = clean.Split(';')[0].Trim();
                    if (clean.IndexOf('(') >= 0) clean = clean.Split('(')[0].Trim();

                    if (!localPrefabs.ContainsKey(clean))
                    {
                        localPrefabs[clean] = FindBuildingPrefab(clean);
                    }
                }

                foreach (BlueprintPiece bp in pieces)
                {
                    if (string.IsNullOrEmpty(bp.prefab)) continue;
                    string clean = bp.prefab.Trim();
                    if (clean.IndexOf(';') >= 0) clean = clean.Split(';')[0].Trim();
                    if (clean.IndexOf('(') >= 0) clean = clean.Split('(')[0].Trim();

                    GameObject prefab;
                    if (!localPrefabs.TryGetValue(clean, out prefab) || prefab == null) continue;

                    Vector3 localPos = new Vector3(bp.x, bp.y, bp.z);
                    Quaternion localRot = (bp.rw == 0f && bp.rx == 0f && bp.ry == 0f && bp.rz == 0f)
                        ? Quaternion.identity
                        : new Quaternion(bp.rx, bp.ry, bp.rz, bp.rw);

                    try
                    {
                        GameObject child = UnityEngine.Object.Instantiate(prefab, _hologramRoot.transform);
                        child.transform.localPosition = localPos;
                        child.transform.localRotation = localRot;
                        if (bp.scaleX != 0f && bp.scaleY != 0f && bp.scaleZ != 0f)
                        {
                            child.transform.localScale = new Vector3(bp.scaleX, bp.scaleY, bp.scaleZ);
                        }

                        PrepareGhostObject(child, ghostLayer);
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                Logger.LogError("Error creating hologram: " + ex);
            }
            finally
            {
                ZNetView.m_forceDisableInit = false;
                TerrainOp.m_forceDisableTerrainOps = false;
            }
        }

        private static void PrepareGhostObject(GameObject obj, int ghostLayer)
        {
            if (obj == null) return;

            // 1. Remove all scripts except text labels
            MonoBehaviour[] mbs = obj.GetComponentsInChildren<MonoBehaviour>(true);
            for (int i = 0; i < mbs.Length; i++)
            {
                MonoBehaviour mb = mbs[i];
                if (mb == null) continue;
                string typeName = mb.GetType().Name;
                if (typeName.IndexOf("Text", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                UnityEngine.Object.DestroyImmediate(mb);
            }

            // 2. Remove all physics colliders
            Collider[] cols = obj.GetComponentsInChildren<Collider>(true);
            for (int i = 0; i < cols.Length; i++)
            {
                UnityEngine.Object.DestroyImmediate(cols[i]);
            }

            // 3. Remove all rigidbodies
            Rigidbody[] rbs = obj.GetComponentsInChildren<Rigidbody>(true);
            for (int i = 0; i < rbs.Length; i++)
            {
                UnityEngine.Object.DestroyImmediate(rbs[i]);
            }

            // 4. Remove internal snap points
            Transform[] tfs = obj.GetComponentsInChildren<Transform>(true);
            for (int i = 0; i < tfs.Length; i++)
            {
                Transform t = tfs[i];
                if (t != null && t.gameObject.name.StartsWith("$hud_snappoint"))
                {
                    UnityEngine.Object.DestroyImmediate(t.gameObject);
                }
            }

            // 5. Set layer to ghost on all transforms
            for (int i = 0; i < tfs.Length; i++)
            {
                if (tfs[i] != null) tfs[i].gameObject.layer = ghostLayer;
            }

            // 6. Replace materials with translucent ghost materials and disable shadows
            Renderer[] renderers = obj.GetComponentsInChildren<Renderer>(true);
            for (int r = 0; r < renderers.Length; r++)
            {
                Renderer rend = renderers[r];
                if (rend == null) continue;

                rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                rend.receiveShadows = false;

                Material[] mats = rend.sharedMaterials;
                if (mats == null || mats.Length == 0) continue;

                Material[] ghostMats = new Material[mats.Length];
                for (int m = 0; m < mats.Length; m++)
                {
                    Material orig = mats[m];
                    if (orig == null) continue;

                    Material gMat;
                    if (!_ghostMaterialCache.TryGetValue(orig.name, out gMat) || gMat == null)
                    {
                        gMat = new Material(orig);
                        gMat.name = orig.name + "_Ghost";

                        // Native Valheim ghost shader properties
                        if (gMat.HasProperty("_RippleDistance")) gMat.SetFloat("_RippleDistance", 0f);
                        if (gMat.HasProperty("_ValueNoise")) gMat.SetFloat("_ValueNoise", 0f);
                        if (gMat.HasProperty("_TriplanarLocalPos")) gMat.SetFloat("_TriplanarLocalPos", 1f);

                        gMat.SetOverrideTag("RenderType", "Transparent");
                        if (gMat.HasProperty("_Color"))
                        {
                            Color c = gMat.color;
                            c.a = 0.55f;
                            // Slightly tint toward vivid blue/cyan for high visibility against foliage and rock
                            c.r = Mathf.Lerp(c.r, 0.35f, 0.5f);
                            c.g = Mathf.Lerp(c.g, 0.85f, 0.5f);
                            c.b = Mathf.Lerp(c.b, 1.0f, 0.6f);
                            gMat.color = c;
                        }

                        _ghostMaterialCache[orig.name] = gMat;
                    }

                    ghostMats[m] = gMat;
                }

                rend.sharedMaterials = ghostMats;
            }
        }

        private void UpdateHologramPlacement(Player player)
        {
            if (player == null || _hologramRoot == null) return;

            Transform cam = Camera.main != null ? Camera.main.transform : null;
            Vector3 rayOrigin = cam != null ? cam.position : (player.transform.position + Vector3.up * 1.5f);
            Vector3 rayDir = cam != null ? cam.forward : player.transform.forward;

            int mask = LayerMask.GetMask("Default", "static_solid", "Default_small", "piece", "terrain");
            RaycastHit hit;
            Vector3 aimPoint;
            if (Physics.Raycast(rayOrigin, rayDir, out hit, 60f, mask))
            {
                aimPoint = hit.point;
            }
            else
            {
                Vector3 flatDir = new Vector3(rayDir.x, 0f, rayDir.z).normalized;
                if (flatDir.sqrMagnitude < 0.001f) flatDir = player.transform.forward;
                aimPoint = player.transform.position + (flatDir * 6f);
            }

            aimPoint.y += _armedHeightOffset;
            _hologramRoot.transform.position = aimPoint;
            _hologramRoot.transform.rotation = Quaternion.Euler(0f, _armedRotationY, 0f);

            // Mouse ScrollWheel: rotate & elevation
            float scroll = Input.GetAxis("Mouse ScrollWheel");
            if (Mathf.Abs(scroll) > 0.01f)
            {
                if (Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl))
                {
                    _armedHeightOffset += (scroll > 0f ? 0.25f : -0.25f);
                }
                else if (Input.GetKey(KeyCode.LeftAlt) || Input.GetKey(KeyCode.RightAlt))
                {
                    _armedHeightOffset += (scroll > 0f ? 1.0f : -1.0f);
                }
                else
                {
                    _armedRotationY = Mathf.Round((_armedRotationY + (scroll > 0f ? 22.5f : -22.5f)) / 22.5f) * 22.5f;
                    while (_armedRotationY >= 360f) _armedRotationY -= 360f;
                    while (_armedRotationY < 0f) _armedRotationY += 360f;
                }
            }

            if (Input.GetKeyDown(KeyCode.Q))
            {
                _armedHeightOffset = 0f;
                _armedRotationY = 0f;
                player.Message(MessageHud.MessageType.TopLeft, "Reset rotation & height offset.");
            }

            if (Input.GetKeyDown(KeyCode.T))
            {
                _autoTerraform = !_autoTerraform;
                player.Message(MessageHud.MessageType.TopLeft, "Auto-Terraform Ground: " + (_autoTerraform ? "ON" : "OFF"));
            }

            bool isChatOpen = Chat.instance != null && Chat.instance.IsChatDialogWindowVisible();
            bool isMenuOpen = Menu.IsVisible();
            bool isInventoryOpen = InventoryGui.IsVisible();
            bool isTextInput = TextInput.IsVisible();

            if (!isChatOpen && !isMenuOpen && !isInventoryOpen && !isTextInput)
            {
                if (Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.G))
                {
                    ExecuteArmedPlacement();
                }
                else if (Input.GetMouseButtonDown(1) || Input.GetKeyDown(KeyCode.Escape))
                {
                    DisarmBlueprint();
                }
            }
        }

        private string GetBuilderStateJson()
        {
            return "{\"isArmed\":" + (_isArmed ? "true" : "false") +
                   ",\"name\":\"" + EscapeJson(_armedBlueprintName) +
                   "\",\"rotationY\":" + _armedRotationY.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) +
                   ",\"heightOffset\":" + _armedHeightOffset.ToString("F1", System.Globalization.CultureInfo.InvariantCulture) +
                   ",\"autoTerraform\":" + (_autoTerraform ? "true" : "false") + "}";
        }

        private void ExecuteArmedPlacement()
        {
            Player player = Player.m_localPlayer;
            if (player == null || _armedPieces == null || _armedPieces.Count == 0) return;

            Vector3 targetPos = _hologramRoot != null ? _hologramRoot.transform.position : GetAimPlacementPosition(player, _armedHeightOffset, 6f);
            Quaternion baseRot = _hologramRoot != null ? _hologramRoot.transform.rotation : GetAimPlacementRotation(player, _armedRotationY);

            DestroyHologram();

            if (_autoTerraform)
            {
                TerraformGroundUnderStructure(_armedPieces, targetPos, baseRot, 1.2f);
            }

            int placed = InstantiatePieces(_armedPieces, targetPos, baseRot, _armedBlueprintName);
            _isArmed = false;
            _armedPieces = null;

            player.Message(MessageHud.MessageType.Center, "★ Built: " + _armedBlueprintName + " (" + placed + " pieces)!\nPress [Ctrl+Z] or [F8] to Undo");
        }

        private void CycleBlueprintFromDisk()
        {
            string dir = GetPlanBuildDir();
            if (!Directory.Exists(dir)) return;

            string[] files = Directory.GetFiles(dir, "*.blueprint");
            if (files.Length == 0)
            {
                Player p = Player.m_localPlayer;
                if (p != null) p.Message(MessageHud.MessageType.Center, "No blueprints found in PlanBuild/blueprints folder");
                return;
            }

            _diskBlueprintIndex = (_diskBlueprintIndex + 1) % files.Length;
            string selectedFile = files[_diskBlueprintIndex];
            string content = File.ReadAllText(selectedFile, Encoding.UTF8);

            string bpName = Path.GetFileNameWithoutExtension(selectedFile).Replace('_', ' ');
            using (StringReader sr = new StringReader(content))
            {
                string line;
                while ((line = sr.ReadLine()) != null)
                {
                    if (line.StartsWith("#Name:"))
                    {
                        bpName = line.Substring(6).Trim();
                        break;
                    }
                }
            }

            _armedPieces = ParseBlueprintText(content);
            if (_armedPieces != null && _armedPieces.Count > 0)
            {
                _armedBlueprintName = bpName;
                _armedRotationY = 0f;
                _armedHeightOffset = 0f;
                _isArmed = true;

                SpawnHologram(_armedPieces);

                Player player = Player.m_localPlayer;
                if (player != null)
                {
                    player.Message(MessageHud.MessageType.Center,
                        "★ [F6] Selected: " + _armedBlueprintName + " (" + _armedPieces.Count + " pcs)\n" +
                        "[Scroll] Rotate | [Ctrl+Scroll] Elevation | [T] Auto-Flatten: " + (_autoTerraform ? "ON" : "OFF") + "\n" +
                        "[Left-Click] / [G] Place | [Right-Click] / [Esc] Cancel");
                }
            }
        }

        private int TerraformGroundUnderStructure(List<BlueprintPiece> pieces, Vector3 basePos, Quaternion baseRot, float margin)
        {
            if (pieces == null || pieces.Count == 0) return 0;
            if (_tcLevelTerrainMethod == null || _tcSaveMethod == null)
            {
                Logger.LogWarning("TerrainComp reflection methods not found; skipping terraform.");
                return 0;
            }

            try
            {
                float minY = float.MaxValue;
                foreach (BlueprintPiece p in pieces)
                {
                    if (p.y < minY) minY = p.y;
                }

                float targetY = basePos.y + minY;

                // Focus on foundation and base pieces (pieces within 1.5m of the lowest point)
                float floorThreshold = minY + 1.5f;
                List<BlueprintPiece> basePieces = new List<BlueprintPiece>();
                foreach (BlueprintPiece p in pieces)
                {
                    if (p.y <= floorThreshold) basePieces.Add(p);
                }
                if (basePieces.Count == 0) basePieces = pieces;

                float minX = float.MaxValue, maxX = float.MinValue;
                float minZ = float.MaxValue, maxZ = float.MinValue;

                foreach (BlueprintPiece p in basePieces)
                {
                    Vector3 worldPos = basePos + (baseRot * new Vector3(p.x, p.y, p.z));
                    if (worldPos.x < minX) minX = worldPos.x;
                    if (worldPos.x > maxX) maxX = worldPos.x;
                    if (worldPos.z < minZ) minZ = worldPos.z;
                    if (worldPos.z > maxZ) maxZ = worldPos.z;
                }

                // Apply margin around the foundation perimeter
                minX -= margin;
                maxX += margin;
                minZ -= margin;
                maxZ += margin;

                Vector3 centerPos = new Vector3((minX + maxX) * 0.5f, targetY, (minZ + maxZ) * 0.5f);
                float width = maxX - minX;
                float depth = maxZ - minZ;
                float totalRadius = Mathf.Max(width, depth) * 0.5f + 4f;

                List<Heightmap> hmaps = new List<Heightmap>();
                Heightmap.FindHeightmap(centerPos, totalRadius, hmaps);
                if (hmaps.Count == 0)
                {
                    Heightmap single = Heightmap.FindHeightmap(centerPos);
                    if (single != null) hmaps.Add(single);
                }

                if (hmaps.Count == 0)
                {
                    Logger.LogWarning("No heightmaps found for terraforming at " + centerPos);
                    return 0;
                }

                HashSet<TerrainComp> comps = new HashSet<TerrainComp>();
                foreach (Heightmap hm in hmaps)
                {
                    if (hm == null) continue;
                    TerrainComp tc = hm.GetAndCreateTerrainCompiler();
                    if (tc != null) comps.Add(tc);
                }

                if (comps.Count == 0)
                {
                    Logger.LogWarning("No terrain compilers found for terraforming.");
                    return 0;
                }

                // Grid-based leveling with overlapping brushes to ensure complete coverage
                float step = 2.0f;
                float brushRadius = 2.2f;
                object[] args = new object[3];
                args[1] = brushRadius;
                args[2] = true; // square brush for clean borders

                for (float x = minX; x <= maxX; x += step)
                {
                    for (float z = minZ; z <= maxZ; z += step)
                    {
                        args[0] = new Vector3(x, targetY, z);
                        foreach (TerrainComp tc in comps)
                        {
                            try { _tcLevelTerrainMethod.Invoke(tc, args); } catch { }
                        }
                    }
                }

                // Ensure boundary edges are explicitly covered
                for (float x = minX; x <= maxX; x += step)
                {
                    args[0] = new Vector3(x, targetY, maxZ);
                    foreach (TerrainComp tc in comps) { try { _tcLevelTerrainMethod.Invoke(tc, args); } catch { } }
                }
                for (float z = minZ; z <= maxZ; z += step)
                {
                    args[0] = new Vector3(maxX, targetY, z);
                    foreach (TerrainComp tc in comps) { try { _tcLevelTerrainMethod.Invoke(tc, args); } catch { } }
                }

                // Commit modifications to ZDO and sync with network
                object[] saveArgs = new object[] { false };
                foreach (TerrainComp tc in comps)
                {
                    try
                    {
                        ZNetView nview = tc.GetComponent<ZNetView>();
                        if (nview != null && nview.IsValid() && !nview.IsOwner())
                        {
                            nview.ClaimOwnership();
                        }
                        _tcSaveMethod.Invoke(tc, saveArgs);
                    }
                    catch (Exception ex)
                    {
                        Logger.LogWarning("Error saving TerrainComp: " + ex.Message);
                    }
                }

                // Immediately rebuild visual & physical mesh colliders
                foreach (Heightmap hm in hmaps)
                {
                    try
                    {
                        if (hm != null) hm.Poke(1, false);
                    }
                    catch { }
                }

                // Clear tall grass, weeds, and clutter under the structure
                try
                {
                    if (ClutterSystem.instance != null)
                    {
                        ClutterSystem.instance.ResetGrass(centerPos, totalRadius);
                    }
                }
                catch { }

                Logger.LogInfo("Terraformed ground under structure at Y=" + targetY + " (" + comps.Count + " zones, " + basePieces.Count + " foundation pieces)");
                return comps.Count;
            }
            catch (Exception ex)
            {
                Logger.LogError("TerraformGroundUnderStructure failed: " + ex);
                return 0;
            }
        }

        private int FlattenTerrainAt(Vector3 center, float radius, float targetY, bool square)
        {
            if (_tcLevelTerrainMethod == null || _tcSaveMethod == null) return 0;

            try
            {
                List<Heightmap> hmaps = new List<Heightmap>();
                Heightmap.FindHeightmap(center, radius + 4f, hmaps);
                if (hmaps.Count == 0)
                {
                    Heightmap single = Heightmap.FindHeightmap(center);
                    if (single != null) hmaps.Add(single);
                }
                if (hmaps.Count == 0) return 0;

                HashSet<TerrainComp> comps = new HashSet<TerrainComp>();
                foreach (Heightmap hm in hmaps)
                {
                    if (hm == null) continue;
                    TerrainComp tc = hm.GetAndCreateTerrainCompiler();
                    if (tc != null) comps.Add(tc);
                }
                if (comps.Count == 0) return 0;

                float step = 2.0f;
                float brushRadius = 2.2f;
                object[] args = new object[3];
                args[1] = brushRadius;
                args[2] = square;

                if (radius <= 2.5f)
                {
                    args[0] = new Vector3(center.x, targetY, center.z);
                    args[1] = radius;
                    foreach (TerrainComp tc in comps)
                    {
                        try { _tcLevelTerrainMethod.Invoke(tc, args); } catch { }
                    }
                }
                else
                {
                    for (float x = center.x - radius; x <= center.x + radius; x += step)
                    {
                        for (float z = center.z - radius; z <= center.z + radius; z += step)
                        {
                            if (!square && Vector2.Distance(new Vector2(x, z), new Vector2(center.x, center.z)) > radius)
                            {
                                continue;
                            }
                            args[0] = new Vector3(x, targetY, z);
                            foreach (TerrainComp tc in comps)
                            {
                                try { _tcLevelTerrainMethod.Invoke(tc, args); } catch { }
                            }
                        }
                    }
                }

                object[] saveArgs = new object[] { false };
                foreach (TerrainComp tc in comps)
                {
                    try
                    {
                        ZNetView nview = tc.GetComponent<ZNetView>();
                        if (nview != null && nview.IsValid() && !nview.IsOwner())
                        {
                            nview.ClaimOwnership();
                        }
                        _tcSaveMethod.Invoke(tc, saveArgs);
                    }
                    catch { }
                }

                foreach (Heightmap hm in hmaps)
                {
                    try { if (hm != null) hm.Poke(1, false); } catch { }
                }

                try
                {
                    if (ClutterSystem.instance != null)
                    {
                        ClutterSystem.instance.ResetGrass(center, radius + 2f);
                    }
                }
                catch { }

                return comps.Count;
            }
            catch (Exception ex)
            {
                Logger.LogError("FlattenTerrainAt failed: " + ex);
                return 0;
            }
        }

        private string TerraformArmedSite()
        {
            Player player = Player.m_localPlayer;
            if (player == null) return "{\"success\":false,\"error\":\"Player not in game\"}";
            if (_armedPieces == null || _armedPieces.Count == 0) return "{\"success\":false,\"error\":\"No armed blueprint\"}";

            Vector3 targetPos = GetAimPlacementPosition(player, _armedHeightOffset, 6f);
            Quaternion baseRot = GetAimPlacementRotation(player, _armedRotationY);

            int count = TerraformGroundUnderStructure(_armedPieces, targetPos, baseRot, 1.2f);
            player.Message(MessageHud.MessageType.Center, "★ Ground Leveled under " + _armedBlueprintName + "!\n(" + count + " zones leveled) Press [G] to Place!");
            return "{\"success\":true,\"zonesModified\":" + count + "}";
        }

        private string HandleTerraformRequest(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null) return "{\"success\":false,\"error\":\"Player not in game\"}";

            bool armed = json != null && (json.IndexOf("\"armed\":true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                         json.IndexOf("\"armed\": true", StringComparison.OrdinalIgnoreCase) >= 0);
            if (armed || (string.IsNullOrEmpty(json.Trim()) && _isArmed))
            {
                return TerraformArmedSite();
            }

            List<BlueprintPiece> pieces = ParseBlueprintText(json);
            if (pieces != null && pieces.Count > 0)
            {
                float rotationY = ExtractJsonFloat(json, "rotationY", 0f);
                float heightOffset = ExtractJsonFloat(json, "heightOffset", 0f);
                float distanceInFront = ExtractJsonFloat(json, "distanceInFront", 6f);
                bool usePlayerPos = json.IndexOf("\"usePlayerPos\":false", StringComparison.OrdinalIgnoreCase) < 0 &&
                                    json.IndexOf("\"usePlayerPos\": false", StringComparison.OrdinalIgnoreCase) < 0;

                float originX = ExtractJsonFloat(json, "originX", float.NaN);
                float originY = ExtractJsonFloat(json, "originY", float.NaN);
                float originZ = ExtractJsonFloat(json, "originZ", float.NaN);

                Vector3 basePos;
                Quaternion baseRot;

                if (usePlayerPos || float.IsNaN(originX) || float.IsNaN(originZ))
                {
                    basePos = GetAimPlacementPosition(player, heightOffset, distanceInFront);
                    baseRot = GetAimPlacementRotation(player, rotationY);
                }
                else
                {
                    float y = float.IsNaN(originY) ? player.transform.position.y : originY;
                    basePos = new Vector3(originX, y + heightOffset, originZ);
                    baseRot = Quaternion.Euler(0f, rotationY, 0f);
                }

                float margin = ExtractJsonFloat(json, "margin", 1.2f);
                int modified = TerraformGroundUnderStructure(pieces, basePos, baseRot, margin);
                player.Message(MessageHud.MessageType.Center, "★ Ground Leveled under Blueprint!\n(" + modified + " zones leveled)");
                return "{\"success\":true,\"zonesModified\":" + modified + "}";
            }

            float radius = ExtractJsonFloat(json, "radius", 8f);
            float targetY = ExtractJsonFloat(json, "targetY", player.transform.position.y);
            float x = ExtractJsonFloat(json, "originX", player.transform.position.x);
            float z = ExtractJsonFloat(json, "originZ", player.transform.position.z);
            bool square = json.IndexOf("\"square\":false", StringComparison.OrdinalIgnoreCase) < 0 &&
                          json.IndexOf("\"square\": false", StringComparison.OrdinalIgnoreCase) < 0;

            Vector3 center = new Vector3(x, targetY, z);
            int zones = FlattenTerrainAt(center, radius, targetY, square);
            player.Message(MessageHud.MessageType.Center, "★ Area Leveled (" + radius + "m radius)!");
            return "{\"success\":true,\"zonesModified\":" + zones + "}";
        }

        #region Grid Planter & Farming Suite

        private string PlantCropGrid(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            string crop = ExtractJsonString(json, "crop");
            if (string.IsNullOrEmpty(crop)) crop = "carrot";

            int rows = (int)ExtractJsonFloat(json, "rows", 5f);
            int cols = (int)ExtractJsonFloat(json, "cols", 5f);
            if (rows < 1) rows = 1;
            if (rows > 30) rows = 30;
            if (cols < 1) cols = 1;
            if (cols > 30) cols = 30;

            float spacing = ExtractJsonFloat(json, "spacing", 0.85f);
            if (spacing < 0.4f) spacing = 0.4f;
            if (spacing > 10f) spacing = 10f;

            bool autoCultivate = ExtractJsonBool(json, "autoCultivate", true);
            bool consumeSeeds = ExtractJsonBool(json, "consumeSeeds", true);
            bool instantMature = ExtractJsonBool(json, "instantMature", false);

            string prefabName;
            string seedItem;
            bool needsCultivate;
            string displayName;
            ResolveCropMetadata(crop, out prefabName, out seedItem, out needsCultivate, out displayName);

            GameObject prefab = ZNetScene.instance != null ? ZNetScene.instance.GetPrefab(prefabName) : null;
            if (prefab == null) prefab = FindBuildingPrefab(prefabName);

            if (prefab == null)
            {
                return "{\"success\":false,\"error\":\"Crop prefab not found in game: " + EscapeJson(prefabName) + "\"}";
            }

            Inventory inv = player.GetInventory();
            bool isFreeBuild = ZoneSystem.instance != null && player.NoCostCheat();
            int currentSeeds = CountInventoryItem(inv, seedItem);

            if (consumeSeeds && !isFreeBuild && currentSeeds <= 0)
            {
                player.Message(MessageHud.MessageType.Center, "No " + seedItem + " in inventory!");
                return "{\"success\":false,\"error\":\"No " + EscapeJson(seedItem) + " found in player inventory\"}";
            }

            Vector3 center;
            Transform cam = Camera.main != null ? Camera.main.transform : null;
            Vector3 aimPoint;
            int terrainMask = LayerMask.GetMask("terrain", "Default", "static_solid", "piece");
            RaycastHit hit;

            if (cam != null && Physics.Raycast(cam.position, cam.forward, out hit, 40f, terrainMask))
            {
                aimPoint = hit.point;
            }
            else
            {
                aimPoint = player.transform.position + player.transform.forward * (Math.Max(rows, cols) * spacing * 0.5f + 2f);
            }

            float explicitX = ExtractJsonFloat(json, "originX", float.NaN);
            float explicitZ = ExtractJsonFloat(json, "originZ", float.NaN);
            if (!float.IsNaN(explicitX) && !float.IsNaN(explicitZ))
            {
                center = new Vector3(explicitX, aimPoint.y, explicitZ);
            }
            else
            {
                center = aimPoint;
            }

            float playerYaw = player.transform.eulerAngles.y;
            float rotationY = ExtractJsonFloat(json, "rotationY", float.NaN);
            float gridYaw = float.IsNaN(rotationY) ? Mathf.Round(playerYaw / 45f) * 45f : rotationY;
            Quaternion gridRot = Quaternion.Euler(0f, gridYaw, 0f);

            float totalWidth = (cols - 1) * spacing;
            float totalHeight = (rows - 1) * spacing;
            float gridRadius = Mathf.Sqrt(totalWidth * totalWidth + totalHeight * totalHeight) * 0.5f;

            if (autoCultivate && needsCultivate)
            {
                CultivateTerrainAt(center, gridRadius + 1.2f);
            }

            int plantedCount = 0;
            int seedsRemaining = currentSeeds;
            float halfW = totalWidth * 0.5f;
            float halfH = totalHeight * 0.5f;

            for (int r = 0; r < rows; r++)
            {
                for (int c = 0; c < cols; c++)
                {
                    if (consumeSeeds && !isFreeBuild && seedsRemaining <= 0) break;

                    float localX = (c * spacing) - halfW;
                    float localZ = (r * spacing) - halfH;

                    Vector3 worldPos = center + gridRot * new Vector3(localX, 0f, localZ);

                    // Accurate ground snap
                    if (Physics.Raycast(worldPos + Vector3.up * 50f, Vector3.down, out hit, 100f, terrainMask))
                    {
                        worldPos.y = hit.point.y;
                    }
                    else if (ZoneSystem.instance != null)
                    {
                        float gh;
                        if (ZoneSystem.instance.GetGroundHeight(worldPos, out gh))
                        {
                            worldPos.y = gh;
                        }
                    }

                    try
                    {
                        GameObject plantObj = UnityEngine.Object.Instantiate(prefab, worldPos, Quaternion.identity);
                        if (plantObj != null)
                        {
                            Piece pieceComp = plantObj.GetComponent<Piece>();
                            if (pieceComp != null)
                            {
                                try { pieceComp.SetCreator(player.GetPlayerID(), PlatformManager.DistributionPlatform.LocalUser.PlatformUserID); } catch { }
                                try { pieceComp.OnPlaced(); } catch { }
                            }

                            Plant plantComp = plantObj.GetComponent<Plant>();
                            if (plantComp != null)
                            {
                                if (instantMature)
                                {
                                    try { plantComp.Grow(); } catch { }
                                }
                            }

                            if (consumeSeeds && !isFreeBuild)
                            {
                                ConsumeInventoryItem(inv, seedItem, 1);
                                seedsRemaining--;
                            }

                            _lastBuildObjects.Add(plantObj);
                            plantedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        Logger.LogWarning("Failed to plant " + prefabName + ": " + ex.Message);
                    }
                }
            }

            player.Message(MessageHud.MessageType.Center,
                "🌱 Planted " + plantedCount + " " + displayName + " in a " + rows + "x" + cols + " grid!\n" +
                (consumeSeeds && !isFreeBuild ? (seedsRemaining + " seeds remaining in bag") : "Free Build: No seeds consumed"));

            return "{\"success\":true,\"plantedCount\":" + plantedCount + ",\"totalRequested\":" + (rows * cols) +
                   ",\"crop\":\"" + EscapeJson(displayName) + "\",\"seedItem\":\"" + EscapeJson(seedItem) +
                   "\",\"remainingSeeds\":" + seedsRemaining + "}";
        }

        private string HarvestNearbyCrops(string json)
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            float radius = ExtractJsonFloat(json, "radius", 15.0f);
            if (radius < 1f) radius = 1f;
            if (radius > 100f) radius = 100f;

            Vector3 center = player.transform.position;
            float rSq = radius * radius;

            Pickable[] allPickables = UnityEngine.Object.FindObjectsOfType<Pickable>();
            int harvestedCount = 0;
            Dictionary<string, int> counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            if (allPickables != null)
            {
                foreach (Pickable p in allPickables)
                {
                    if (p == null || p.gameObject == null) continue;
                    if ((p.transform.position - center).sqrMagnitude > rSq) continue;
                    if (!p.CanBePicked()) continue;

                    string itemName = (p.m_itemPrefab != null) ? p.m_itemPrefab.name : p.GetHoverName();
                    if (string.IsNullOrEmpty(itemName)) itemName = "Crop";

                    try
                    {
                        p.Interact(player, false, false);
                        harvestedCount++;
                        if (counts.ContainsKey(itemName)) counts[itemName]++;
                        else counts[itemName] = 1;
                    }
                    catch { }
                }
            }

            if (harvestedCount > 0)
            {
                player.Message(MessageHud.MessageType.Center, "🌾 Harvested " + harvestedCount + " crops!");
            }
            else
            {
                player.Message(MessageHud.MessageType.Center, "No ripe crops found within " + radius.ToString("F1") + "m.");
            }

            StringBuilder countsSb = new StringBuilder();
            countsSb.Append("{");
            int cIdx = 0;
            foreach (var kvp in counts)
            {
                if (cIdx > 0) countsSb.Append(",");
                countsSb.Append("\"" + EscapeJson(kvp.Key) + "\":" + kvp.Value);
                cIdx++;
            }
            countsSb.Append("}");

            return "{\"success\":true,\"harvestedCount\":" + harvestedCount + ",\"items\":" + countsSb.ToString() + "}";
        }

        private string GetFarmStatusJson()
        {
            Player player = Player.m_localPlayer;
            if (player == null)
            {
                return "{\"success\":false,\"error\":\"Player not in game\"}";
            }

            Inventory inv = player.GetInventory();
            Vector3 center = player.transform.position;
            float rSq = 30f * 30f;

            string[] knownSeeds = new string[] {
                "CarrotSeeds", "TurnipSeeds", "OnionSeeds", "Barley", "Flax",
                "MushroomJotunPuffs", "MushroomMagecap", "Fiddlehead", "SmokePuff", "Vineberry",
                "Carrot", "Turnip", "Onion",
                "BeechSeeds", "FirCone", "PineCone", "BirchSeeds", "Acorn"
            };

            StringBuilder seedsJson = new StringBuilder();
            seedsJson.Append("{");
            int sIdx = 0;
            foreach (string s in knownSeeds)
            {
                int count = CountInventoryItem(inv, s);
                if (sIdx > 0) seedsJson.Append(",");
                seedsJson.Append("\"" + s + "\":" + count);
                sIdx++;
            }
            seedsJson.Append("}");

            int growingCount = 0;
            int ripeCount = 0;

            Plant[] plants = UnityEngine.Object.FindObjectsOfType<Plant>();
            if (plants != null)
            {
                foreach (Plant p in plants)
                {
                    if (p != null && (p.transform.position - center).sqrMagnitude <= rSq)
                    {
                        growingCount++;
                    }
                }
            }

            Pickable[] pickables = UnityEngine.Object.FindObjectsOfType<Pickable>();
            if (pickables != null)
            {
                foreach (Pickable p in pickables)
                {
                    if (p != null && (p.transform.position - center).sqrMagnitude <= rSq && p.CanBePicked())
                    {
                        ripeCount++;
                    }
                }
            }

            return "{\"success\":true,\"seeds\":" + seedsJson.ToString() + ",\"nearbyGrowing\":" + growingCount + ",\"nearbyRipe\":" + ripeCount + "}";
        }

        private void CultivateTerrainAt(Vector3 center, float radius)
        {
            try
            {
                List<Heightmap> hmaps = new List<Heightmap>();
                Heightmap.FindHeightmap(center, radius + 4f, hmaps);
                if (hmaps == null || hmaps.Count == 0)
                {
                    Heightmap single = Heightmap.FindHeightmap(center);
                    if (single != null) hmaps.Add(single);
                }
                if (hmaps.Count == 0) return;

                HashSet<TerrainComp> comps = new HashSet<TerrainComp>();
                foreach (Heightmap hm in hmaps)
                {
                    if (hm == null) continue;
                    TerrainComp tc = hm.GetAndCreateTerrainCompiler();
                    if (tc != null) comps.Add(tc);
                }
                if (comps.Count == 0) return;

                TerrainOp.Settings settings = new TerrainOp.Settings();
                settings.m_paintCleared = true;
                settings.m_paintType = TerrainModifier.PaintType.Cultivate;
                settings.m_paintRadius = radius;

                if (_tcPaintClearedMethod != null)
                {
                    object[] paintArgs = new object[] { center, Vector3.zero, settings };
                    foreach (TerrainComp tc in comps)
                    {
                        try
                        {
                            _tcPaintClearedMethod.Invoke(tc, paintArgs);
                        }
                        catch { }
                    }
                }

                object[] saveArgs = new object[] { false };
                foreach (TerrainComp tc in comps)
                {
                    try
                    {
                        ZNetView nview = tc.GetComponent<ZNetView>();
                        if (nview != null && nview.IsValid() && !nview.IsOwner())
                        {
                            nview.ClaimOwnership();
                        }
                        if (_tcSaveMethod != null) _tcSaveMethod.Invoke(tc, saveArgs);
                    }
                    catch { }
                }

                foreach (Heightmap hm in hmaps)
                {
                    try { if (hm != null) hm.Poke(1, false); } catch { }
                }

                try
                {
                    if (ClutterSystem.instance != null)
                    {
                        ClutterSystem.instance.ResetGrass(center, radius);
                    }
                }
                catch { }
            }
            catch (Exception ex)
            {
                Logger.LogWarning("CultivateTerrainAt failed: " + ex.Message);
            }
        }

        private static void ResolveCropMetadata(string crop, out string prefab, out string seed, out bool needsCultivate, out string displayName)
        {
            string c = crop.Trim().ToLowerInvariant();
            needsCultivate = true;

            if (c == "carrot" || c == "carrots" || c == "sapling_carrot")
            {
                prefab = "Sapling_Carrot";
                seed = "CarrotSeeds";
                displayName = "Carrots";
            }
            else if (c == "seedcarrot" || c == "seed_carrot" || c == "sapling_seedcarrot")
            {
                prefab = "Sapling_SeedCarrot";
                seed = "Carrot";
                displayName = "Seed Carrots";
            }
            else if (c == "turnip" || c == "turnips" || c == "sapling_turnip")
            {
                prefab = "Sapling_Turnip";
                seed = "TurnipSeeds";
                displayName = "Turnips";
            }
            else if (c == "seedturnip" || c == "seed_turnip" || c == "sapling_seedturnip")
            {
                prefab = "Sapling_SeedTurnip";
                seed = "Turnip";
                displayName = "Seed Turnips";
            }
            else if (c == "onion" || c == "onions" || c == "sapling_onion")
            {
                prefab = "Sapling_Onion";
                seed = "OnionSeeds";
                displayName = "Onions";
            }
            else if (c == "seedonion" || c == "seed_onion" || c == "sapling_seedonion")
            {
                prefab = "Sapling_SeedOnion";
                seed = "Onion";
                displayName = "Seed Onions";
            }
            else if (c == "barley" || c == "sapling_barley")
            {
                prefab = "Barley";
                seed = "Barley";
                displayName = "Barley";
            }
            else if (c == "flax" || c == "sapling_flax")
            {
                prefab = "Flax";
                seed = "Flax";
                displayName = "Flax";
            }
            else if (c.Contains("jotun") || c.Contains("puffs"))
            {
                prefab = "Sapling_Mushroom_JotunPuffs";
                seed = "MushroomJotunPuffs";
                displayName = "Jotun Puffs";
            }
            else if (c.Contains("magecap"))
            {
                prefab = "Sapling_Magecap";
                seed = "MushroomMagecap";
                displayName = "Magecap";
            }
            else if (c.Contains("fiddlehead"))
            {
                prefab = "Sapling_Fiddlehead";
                seed = "Fiddlehead";
                displayName = "Fiddlehead";
            }
            else if (c.Contains("smokepuff"))
            {
                prefab = "Sapling_SmokePuff";
                seed = "SmokePuff";
                displayName = "Smoke Puff";
            }
            else if (c.Contains("vineberry"))
            {
                prefab = "Sapling_Vineberry";
                seed = "Vineberry";
                displayName = "Vineberry";
            }
            else if (c == "fir" || c == "sapling_fir")
            {
                prefab = "Sapling_Fir";
                seed = "FirCone";
                needsCultivate = false;
                displayName = "Fir Trees";
            }
            else if (c == "pine" || c == "sapling_pine")
            {
                prefab = "Sapling_Pine";
                seed = "PineCone";
                needsCultivate = false;
                displayName = "Pine Trees";
            }
            else if (c == "birch" || c == "sapling_birch")
            {
                prefab = "Sapling_Birch";
                seed = "BirchSeeds";
                needsCultivate = false;
                displayName = "Birch Trees";
            }
            else if (c == "oak" || c == "sapling_oak")
            {
                prefab = "Sapling_Oak";
                seed = "Acorn";
                needsCultivate = false;
                displayName = "Oak Trees";
            }
            else if (c == "beech" || c == "sapling_beech")
            {
                prefab = "Sapling_Beech";
                seed = "BeechSeeds";
                needsCultivate = false;
                displayName = "Beech Trees";
            }
            else
            {
                prefab = crop;
                seed = crop;
                displayName = crop;
            }
        }

        private static int CountInventoryItem(Inventory inv, string prefabName)
        {
            if (inv == null || string.IsNullOrEmpty(prefabName)) return 0;
            int total = 0;
            List<ItemDrop.ItemData> items = inv.GetAllItems();
            if (items == null) return 0;
            foreach (ItemDrop.ItemData item in items)
            {
                if (item != null && item.m_dropPrefab != null &&
                    item.m_dropPrefab.name.Equals(prefabName, StringComparison.OrdinalIgnoreCase))
                {
                    total += item.m_stack;
                }
            }
            return total;
        }

        private static int ConsumeInventoryItem(Inventory inv, string prefabName, int amount)
        {
            if (inv == null || amount <= 0 || string.IsNullOrEmpty(prefabName)) return 0;
            int remaining = amount;
            List<ItemDrop.ItemData> items = inv.GetAllItems();
            if (items == null) return 0;
            for (int i = items.Count - 1; i >= 0; i--)
            {
                ItemDrop.ItemData item = items[i];
                if (item != null && item.m_dropPrefab != null &&
                    item.m_dropPrefab.name.Equals(prefabName, StringComparison.OrdinalIgnoreCase))
                {
                    if (item.m_stack <= remaining)
                    {
                        remaining -= item.m_stack;
                        inv.RemoveItem(item);
                    }
                    else
                    {
                        item.m_stack -= remaining;
                        remaining = 0;
                        break;
                    }
                    if (remaining <= 0) break;
                }
            }
            return amount - remaining;
        }

        #endregion

        private string UndoLastBuild()
        {
            if (_lastBuildObjects == null || _lastBuildObjects.Count == 0)
            {
                return "{\"success\":false,\"error\":\"No recent auto-build to undo\"}";
            }

            int count = 0;
            foreach (GameObject go in _lastBuildObjects)
            {
                if (go != null)
                {
                    try
                    {
                        ZNetView nview = go.GetComponent<ZNetView>();
                        if (nview != null && nview.IsValid())
                        {
                            nview.ClaimOwnership();
                            nview.Destroy();
                        }
                        else
                        {
                            UnityEngine.Object.Destroy(go);
                        }
                        count++;
                    }
                    catch { }
                }
            }
            _lastBuildObjects.Clear();

            Player player = Player.m_localPlayer;
            if (player != null)
            {
                player.Message(MessageHud.MessageType.Center, "Undid Auto-Build (removed " + count + " pieces)");
            }

            return "{\"success\":true,\"undoneCount\":" + count + "}";
        }

        private string GetPlanBuildDir()
        {
            try
            {
                string dir = Path.Combine(Paths.ConfigPath, "PlanBuild", "blueprints");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                return dir;
            }
            catch
            {
                string dir = Path.Combine(Directory.GetCurrentDirectory(), "BepInEx", "config", "PlanBuild", "blueprints");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                return dir;
            }
        }

        private bool IsPlanBuildInstalled()
        {
            try
            {
                if (BepInEx.Bootstrap.Chainloader.PluginInfos != null &&
                    (BepInEx.Bootstrap.Chainloader.PluginInfos.ContainsKey("MathiasDecrock.PlanBuild") ||
                     BepInEx.Bootstrap.Chainloader.PluginInfos.ContainsKey("sirskunkalot.PlanBuild")))
                {
                    return true;
                }
            }
            catch { }

            try
            {
                string planDll = Path.Combine(Paths.PluginPath, "PlanBuild", "PlanBuild.dll");
                if (File.Exists(planDll)) return true;
                string directDll = Path.Combine(Paths.PluginPath, "PlanBuild.dll");
                if (File.Exists(directDll)) return true;
            }
            catch { }

            return false;
        }

        private string GetPlanBuildStatus()
        {
            bool installed = IsPlanBuildInstalled();
            string dir = GetPlanBuildDir();
            int count = 0;
            if (Directory.Exists(dir))
            {
                count = Directory.GetFiles(dir, "*.blueprint").Length + Directory.GetFiles(dir, "*.vbuild").Length;
            }
            return "{\"installed\":" + (installed ? "true" : "false") + ",\"blueprintCount\":" + count + ",\"path\":\"" + EscapeJson(dir) + "\"}";
        }

        private string SyncToPlanBuild(string json)
        {
            if (string.IsNullOrEmpty(json))
            {
                return "{\"success\":false,\"error\":\"Empty payload\"}";
            }

            string name = ExtractJsonString(json, "name");
            if (string.IsNullOrEmpty(name)) name = "Blueprint_" + DateTime.Now.ToString("yyyyMMdd_HHmmss");

            // Sanitize file name
            char[] invalidChars = Path.GetInvalidFileNameChars();
            foreach (char c in invalidChars)
            {
                name = name.Replace(c, '_');
            }
            name = name.Trim();

            string dir = GetPlanBuildDir();
            string filePath = Path.Combine(dir, name + ".blueprint");

            string rawContent = ExtractJsonString(json, "rawContent");
            if (string.IsNullOrEmpty(rawContent)) rawContent = ExtractJsonString(json, "content");

            StringBuilder sb = new StringBuilder();

            if (!string.IsNullOrEmpty(rawContent) && (rawContent.IndexOf(';') >= 0 || rawContent.StartsWith("#")))
            {
                sb.Append(rawContent);
            }
            else
            {
                string author = ExtractJsonString(json, "author");
                if (string.IsNullOrEmpty(author)) author = "Antigravity";
                string desc = ExtractJsonString(json, "description");
                if (string.IsNullOrEmpty(desc)) desc = "Synced from Valheim Companion App";
                string category = ExtractJsonString(json, "category");
                if (string.IsNullOrEmpty(category)) category = "Blueprints";

                List<BlueprintPiece> pieces = ParseBlueprintPieces(json);
                if (pieces == null || pieces.Count == 0)
                {
                    return "{\"success\":false,\"error\":\"No pieces to sync\"}";
                }

                sb.AppendLine("#Name:" + name);
                sb.AppendLine("#Creator:" + author);
                sb.AppendLine("#Description:\"" + EscapeJson(desc) + "\"");
                sb.AppendLine("#Category:" + category);
                sb.AppendLine("#SnapPoints");
                sb.AppendLine("#Pieces");

                foreach (BlueprintPiece p in pieces)
                {
                    if (string.IsNullOrEmpty(p.prefab)) continue;
                    string cleanPrefab = p.prefab.Trim();
                    if (cleanPrefab.IndexOf(';') >= 0) cleanPrefab = cleanPrefab.Split(';')[0].Trim();
                    if (cleanPrefab.IndexOf('(') >= 0) cleanPrefab = cleanPrefab.Split('(')[0].Trim();

                    string canonical;
                    if (PrefabAliases.TryGetValue(cleanPrefab, out canonical))
                    {
                        cleanPrefab = canonical;
                    }
                    else
                    {
                        GameObject go = FindBuildingPrefab(cleanPrefab);
                        if (go != null) cleanPrefab = go.name;
                    }

                    string line = string.Format(System.Globalization.CultureInfo.InvariantCulture,
                        "{0};{1};{2:F4};{3:F4};{4:F4};{5:F6};{6:F6};{7:F6};{8:F6};\"\"",
                        cleanPrefab, category, p.x, p.y, p.z, p.rx, p.ry, p.rz, p.rw);
                    sb.AppendLine(line);
                }
            }

            File.WriteAllText(filePath, sb.ToString(), Encoding.UTF8);

            // Notify player in game
            Player player = Player.m_localPlayer;
            if (player != null)
            {
                player.Message(MessageHud.MessageType.Center, "Saved \"" + name + "\" to PlanBuild!\nEquip Blueprint Rune to place.");
            }

            // Attempt to trigger PlanBuild reload via reflection if PlanBuild is loaded
            NotifyPlanBuildReload();

            return "{\"success\":true,\"name\":\"" + EscapeJson(name) + "\",\"filePath\":\"" + EscapeJson(filePath) + "\"}";
        }

        private static void NotifyPlanBuildReload()
        {
            try
            {
                foreach (Assembly asm in AppDomain.CurrentDomain.GetAssemblies())
                {
                    if (asm.GetName().Name == "PlanBuild")
                    {
                        Type syncType = asm.GetType("PlanBuild.Blueprints.BlueprintSync");
                        if (syncType != null)
                        {
                            MethodInfo mi = syncType.GetMethod("GetLocalBlueprints", BindingFlags.Public | BindingFlags.Static);
                            if (mi != null) mi.Invoke(null, null);
                        }
                        break;
                    }
                }
            }
            catch { }
        }

        private string GetPlanBuildBlueprintsList()
        {
            string dir = GetPlanBuildDir();
            if (!Directory.Exists(dir))
            {
                return "{\"blueprints\":[]}";
            }

            string[] files = Directory.GetFiles(dir, "*.*");
            StringBuilder sb = new StringBuilder();
            sb.Append("{\"blueprints\":[");
            int count = 0;
            foreach (string file in files)
            {
                string ext = Path.GetExtension(file).ToLowerInvariant();
                if (ext != ".blueprint" && ext != ".vbuild") continue;

                if (count > 0) sb.Append(",");
                string fileName = Path.GetFileNameWithoutExtension(file);
                sb.Append("{\"name\":\"" + EscapeJson(fileName) + "\",\"file\":\"" + EscapeJson(Path.GetFileName(file)) + "\",\"format\":\"" + ext.TrimStart('.') + "\"}");
                count++;
            }
            sb.Append("]}");
            return sb.ToString();
        }

        private List<BlueprintPiece> ParseBlueprintPieces(string json)
        {
            List<BlueprintPiece> list = new List<BlueprintPiece>();
            if (string.IsNullOrEmpty(json)) return list;

            int itemsIdx = json.IndexOf("\"pieces\"");
            if (itemsIdx < 0) return list;

            int arrStart = json.IndexOf('[', itemsIdx);
            int arrEnd = json.LastIndexOf(']');
            if (arrStart < 0 || arrEnd <= arrStart) return list;

            string arrayContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
            string[] objects = arrayContent.Split(new string[] { "},{" }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string obj in objects)
            {
                string clean = obj.Trim('{', '}');
                string p = ExtractJsonString(clean, "prefab");
                if (string.IsNullOrEmpty(p)) p = ExtractJsonString(clean, "name");

                if (!string.IsNullOrEmpty(p))
                {
                    BlueprintPiece piece = new BlueprintPiece();
                    if (p.IndexOf(';') >= 0)
                    {
                        string[] parts = p.Split(';');
                        p = parts[0].Trim();
                        if (parts.Length >= 5)
                        {
                            float.TryParse(parts[2].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out piece.x);
                            float.TryParse(parts[3].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out piece.y);
                            float.TryParse(parts[4].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out piece.z);
                            if (parts.Length > 8)
                            {
                                float.TryParse(parts[5].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out piece.rx);
                                float.TryParse(parts[6].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out piece.ry);
                                float.TryParse(parts[7].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out piece.rz);
                                float.TryParse(parts[8].Replace(',', '.'), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out piece.rw);
                            }
                        }
                    }
                    if (p.IndexOf('(') >= 0) p = p.Split('(')[0].Trim();
                    piece.prefab = p;
                    if (piece.x == 0f && piece.y == 0f && piece.z == 0f)
                    {
                        piece.x = ExtractJsonFloat(clean, "x", ExtractJsonFloat(clean, "posX", 0f));
                        piece.y = ExtractJsonFloat(clean, "y", ExtractJsonFloat(clean, "posY", 0f));
                        piece.z = ExtractJsonFloat(clean, "z", ExtractJsonFloat(clean, "posZ", 0f));
                    }
                    if (piece.rw == 0f && piece.rx == 0f && piece.ry == 0f && piece.rz == 0f)
                    {
                        piece.rx = ExtractJsonFloat(clean, "rx", ExtractJsonFloat(clean, "rotX", 0f));
                        piece.ry = ExtractJsonFloat(clean, "ry", ExtractJsonFloat(clean, "rotY", 0f));
                        piece.rz = ExtractJsonFloat(clean, "rz", ExtractJsonFloat(clean, "rotZ", 0f));
                        piece.rw = ExtractJsonFloat(clean, "rw", ExtractJsonFloat(clean, "rotW", 1f));
                    }
                    list.Add(piece);
                }
            }

            return list;
        }

        private string GetPinsJson()
        {
            Minimap minimap = Minimap.instance;
            if (minimap == null)
            {
                return "[]";
            }

            FieldInfo pinsField = typeof(Minimap).GetField("m_pins", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            if (pinsField == null)
            {
                return "[]";
            }

            IList pinsList = pinsField.GetValue(minimap) as IList;
            if (pinsList == null || pinsList.Count == 0)
            {
                return "[]";
            }

            StringBuilder sb = new StringBuilder();
            sb.Append("[");
            int count = 0;
            for (int i = 0; i < pinsList.Count; i++)
            {
                Minimap.PinData pin = pinsList[i] as Minimap.PinData;
                if (pin == null) continue;

                if (count > 0) sb.Append(",");
                sb.Append("{");
                sb.Append("\"name\":\"" + EscapeJson(pin.m_name) + "\",");
                sb.Append("\"type\":" + (int)pin.m_type + ",");
                sb.Append("\"typeName\":\"" + EscapeJson(pin.m_type.ToString()) + "\",");
                sb.Append("\"checked\":" + (pin.m_checked ? "true" : "false") + ",");
                sb.Append("\"pos\":{");
                sb.Append("\"x\":" + pin.m_pos.x.ToString("F1") + ",");
                sb.Append("\"y\":" + pin.m_pos.y.ToString("F1") + ",");
                sb.Append("\"z\":" + pin.m_pos.z.ToString("F1"));
                sb.Append("}");
                sb.Append("}");
                count++;
            }
            sb.Append("]");
            return sb.ToString();
        }

        private byte[] _cachedMapJpg = null;
        private int _cachedMapTimestamp = 0;

        private byte[] GetMapTextureJpg()
        {
            Minimap minimap = Minimap.instance;
            if (minimap == null) return null;

            FieldInfo texField = typeof(Minimap).GetField("m_mapTexture", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            if (texField == null) return null;

            Texture2D mapTex = texField.GetValue(minimap) as Texture2D;
            if (mapTex == null) return null;

            if (_cachedMapJpg != null && Environment.TickCount - _cachedMapTimestamp < 30000)
            {
                return _cachedMapJpg;
            }

            try
            {
                if (mapTex.isReadable)
                {
                    _cachedMapJpg = ImageConversion.EncodeToJPG(mapTex, 85);
                    _cachedMapTimestamp = Environment.TickCount;
                    return _cachedMapJpg;
                }
            }
            catch { }

            try
            {
                RenderTexture rt = RenderTexture.GetTemporary(mapTex.width, mapTex.height, 0, RenderTextureFormat.ARGB32);
                Graphics.Blit(mapTex, rt);
                RenderTexture prev = RenderTexture.active;
                RenderTexture.active = rt;

                Texture2D readableTex = new Texture2D(mapTex.width, mapTex.height, TextureFormat.RGBA32, false);
                readableTex.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
                readableTex.Apply();

                RenderTexture.active = prev;
                RenderTexture.ReleaseTemporary(rt);

                _cachedMapJpg = ImageConversion.EncodeToJPG(readableTex, 85);
                _cachedMapTimestamp = Environment.TickCount;
                UnityEngine.Object.Destroy(readableTex);

                return _cachedMapJpg;
            }
            catch { }

            return null;
        }

        private byte[] _cachedFogPng = null;
        private int _cachedFogTimestamp = 0;

        private byte[] GetFogTexturePng()
        {
            Minimap minimap = Minimap.instance;
            if (minimap == null) return null;

            FieldInfo fogField = typeof(Minimap).GetField("m_fogTexture", BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
            if (fogField == null) return null;

            Texture2D fogTex = fogField.GetValue(minimap) as Texture2D;
            if (fogTex == null) return null;

            if (_cachedFogPng != null && Environment.TickCount - _cachedFogTimestamp < 10000)
            {
                return _cachedFogPng;
            }

            try
            {
                if (fogTex.isReadable)
                {
                    _cachedFogPng = ImageConversion.EncodeToPNG(fogTex);
                    _cachedFogTimestamp = Environment.TickCount;
                    return _cachedFogPng;
                }
            }
            catch { }

            try
            {
                RenderTexture rt = RenderTexture.GetTemporary(fogTex.width, fogTex.height, 0, RenderTextureFormat.ARGB32);
                Graphics.Blit(fogTex, rt);
                RenderTexture prev = RenderTexture.active;
                RenderTexture.active = rt;

                Texture2D readableTex = new Texture2D(fogTex.width, fogTex.height, TextureFormat.RGBA32, false);
                readableTex.ReadPixels(new Rect(0, 0, rt.width, rt.height), 0, 0);
                readableTex.Apply();

                RenderTexture.active = prev;
                RenderTexture.ReleaseTemporary(rt);

                _cachedFogPng = ImageConversion.EncodeToPNG(readableTex);
                _cachedFogTimestamp = Environment.TickCount;
                UnityEngine.Object.Destroy(readableTex);

                return _cachedFogPng;
            }
            catch { }

            return null;
        }

        private static void TriggerInventoryChanged(Inventory inv)
        {
            if (inv != null && inv.m_onChanged != null)
            {
                try
                {
                    inv.m_onChanged();
                }
                catch { }
            }
        }

        // ==========================================
        // LIGHTWEIGHT JSON HELPERS (NO EXTERNAL LIBS)
        // ==========================================

        private class LoadoutReq
        {
            public string prefab;
            public int amount;
            public int quality;
        }

        private class FullItemReq
        {
            public string prefab;
            public int stack;
            public int quality;
            public int variant;
            public float durability;
            public int gridX;
            public int gridY;
            public bool equipped;
        }

        private List<LoadoutReq> ParseLoadoutRequests(string json)
        {
            List<LoadoutReq> list = new List<LoadoutReq>();
            if (string.IsNullOrEmpty(json)) return list;

            int itemsIdx = json.IndexOf("\"items\"");
            if (itemsIdx < 0) return list;

            int arrStart = json.IndexOf('[', itemsIdx);
            int arrEnd = json.LastIndexOf(']');
            if (arrStart < 0 || arrEnd <= arrStart) return list;

            string arrayContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
            string[] objects = arrayContent.Split(new string[] { "},{" }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string obj in objects)
            {
                string clean = obj.Trim('{', '}');
                string p = ExtractJsonString(clean, "prefab");
                int a = ExtractJsonInt(clean, "amount", 1);
                int q = ExtractJsonInt(clean, "quality", 1);

                if (!string.IsNullOrEmpty(p))
                {
                    LoadoutReq req = new LoadoutReq();
                    req.prefab = p;
                    req.amount = a;
                    req.quality = q;
                    list.Add(req);
                }
            }

            return list;
        }

        private List<FullItemReq> ParseFullInventoryRequests(string json)
        {
            List<FullItemReq> list = new List<FullItemReq>();
            if (string.IsNullOrEmpty(json)) return list;

            int itemsIdx = json.IndexOf("\"items\"");
            if (itemsIdx < 0) return list;

            int arrStart = json.IndexOf('[', itemsIdx);
            int arrEnd = json.LastIndexOf(']');
            if (arrStart < 0 || arrEnd <= arrStart) return list;

            string arrayContent = json.Substring(arrStart + 1, arrEnd - arrStart - 1);
            string[] objects = arrayContent.Split(new string[] { "},{" }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string obj in objects)
            {
                string clean = obj.Trim('{', '}');
                string p = ExtractJsonString(clean, "prefab");
                int s = ExtractJsonInt(clean, "stack", 1);
                int q = ExtractJsonInt(clean, "quality", 1);
                int v = ExtractJsonInt(clean, "variant", 0);
                float d = ExtractJsonFloat(clean, "durability", -1f);
                int gx = ExtractJsonInt(clean, "gridX", 0);
                int gy = ExtractJsonInt(clean, "gridY", 0);
                bool eq = clean.IndexOf("\"equipped\":true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                          clean.IndexOf("\"equipped\": true", StringComparison.OrdinalIgnoreCase) >= 0;

                if (!string.IsNullOrEmpty(p))
                {
                    FullItemReq req = new FullItemReq();
                    req.prefab = p;
                    req.stack = s;
                    req.quality = q;
                    req.variant = v;
                    req.durability = d;
                    req.gridX = gx;
                    req.gridY = gy;
                    req.equipped = eq;
                    list.Add(req);
                }
            }

            return list;
        }

        private static string ExtractJsonString(string json, string key)
        {
            string pattern = "\"" + key + "\":\"";
            int idx = json.IndexOf(pattern);
            if (idx < 0)
            {
                pattern = "\"" + key + "\": \"";
                idx = json.IndexOf(pattern);
            }
            if (idx < 0) return "";

            int start = idx + pattern.Length;
            int end = json.IndexOf('"', start);
            if (end < 0) return "";

            return json.Substring(start, end - start);
        }

        private static int ExtractJsonInt(string json, string key, int defaultValue)
        {
            string pattern = "\"" + key + "\":";
            int idx = json.IndexOf(pattern);
            if (idx < 0)
            {
                pattern = "\"" + key + "\": ";
                idx = json.IndexOf(pattern);
            }
            if (idx < 0) return defaultValue;

            int start = idx + pattern.Length;
            int end = start;
            while (end < json.Length && (char.IsDigit(json[end]) || json[end] == '-'))
            {
                end++;
            }

            string numStr = json.Substring(start, end - start).Trim();
            int parsed;
            if (int.TryParse(numStr, out parsed))
            {
                return parsed;
            }
            return defaultValue;
        }

        private static float ExtractJsonFloat(string json, string key, float defaultValue)
        {
            string pattern = "\"" + key + "\":";
            int idx = json.IndexOf(pattern);
            if (idx < 0)
            {
                pattern = "\"" + key + "\": ";
                idx = json.IndexOf(pattern);
            }
            if (idx < 0) return defaultValue;

            int start = idx + pattern.Length;
            int end = start;
            while (end < json.Length && (char.IsDigit(json[end]) || json[end] == '-' || json[end] == '.'))
            {
                end++;
            }

            string numStr = json.Substring(start, end - start).Trim();
            float parsed;
            if (float.TryParse(numStr, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out parsed))
            {
                return parsed;
            }
            return defaultValue;
        }

        private static bool ExtractJsonBool(string json, string key, bool defaultValue)
        {
            if (string.IsNullOrEmpty(json)) return defaultValue;
            string pattern = "\"" + key + "\":";
            int idx = json.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (idx < 0)
            {
                pattern = "\"" + key + "\": ";
                idx = json.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            }
            if (idx < 0) return defaultValue;

            int start = idx + pattern.Length;
            while (start < json.Length && char.IsWhiteSpace(json[start])) start++;
            if (start < json.Length)
            {
                if (json.Length >= start + 4 && string.Equals(json.Substring(start, 4), "true", StringComparison.OrdinalIgnoreCase)) return true;
                if (json.Length >= start + 5 && string.Equals(json.Substring(start, 5), "false", StringComparison.OrdinalIgnoreCase)) return false;
            }
            return defaultValue;
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "");
        }
    }
}
