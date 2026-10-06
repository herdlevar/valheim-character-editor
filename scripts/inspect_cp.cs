using System;
using System.Reflection;
using System.Text;

public class InspectCompletePath
{
    public static void Main()
    {
        // Check method body or parameters
        MethodInfo m = typeof(Minimap).GetMethod("GetCompleteTexturePath", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
        if (m != null)
        {
            Console.WriteLine(m.ToString());
        }
    }
}
