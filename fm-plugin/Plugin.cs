// Scout Lab Link: adds a "SCOUT LAB" button to FM27's top menu bar, after CLUB. It shows while a player's profile is
// open; clicking it opens that player in Scout Lab (your fm27-scout-lab.html) in Chrome or Edge.
// A second "SCOUT LAB" button sits next to the X on the opposition scout report pop-up; it opens Scout Lab's
// Matches > Brief page on that club.
// It only reads the screen (player name, club, age) and starts the browser: nothing in the game or the save changes.
// Ctrl+F9 still saves a map of the current screen to BepInEx\scoutlab\screen_N.txt (for fixing the plugin after FM patches).
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using UnityEngine;
using UnityEngine.UIElements;

namespace ScoutLabLink
{
    [BepInPlugin("scoutlab.link", "Scout Lab Link", "0.3.0")]
    public class Plugin : BasePlugin
    {
        internal static ManualLogSource L;
        internal static ConfigEntry<string> HtmlPath, Browser;
        public override void Load()
        {
            L = Log;
            HtmlPath = Config.Bind("ScoutLab", "HtmlPath", "",
                "Full path of your fm27-scout-lab.html. Empty: the newest fm27-scout-lab*.html in your Downloads folder.");
            Browser = Config.Bind("ScoutLab", "Browser", "auto",
                "chrome, edge, or auto (Chrome if installed, else Edge). Use the browser you normally open Scout Lab in: your loaded save is kept there.");
            AddComponent<Ticker>();
            L.LogInfo("Scout Lab Link 0.3.0 loaded");
        }
    }

    public class Ticker : MonoBehaviour
    {
        public Ticker(IntPtr ptr) : base(ptr) { }
        int saved;
        float nextScan;
        VisualElement root, button, bar;
        Label label, oppLabel, flashLabel;
        Il2CppSystem.Action onClick, onOppClick;   // kept so they aren't garbage-collected
        string who;                    // name|club|age of the profile on screen, or null
        string oppClub;                // club on the opposition report pop-up, or null
        VisualElement oppButton;

        void Update()
        {
            try
            {
                var kb = UnityEngine.InputSystem.Keyboard.current;
                if (kb != null && kb.f9Key.wasPressedThisFrame && (kb.leftCtrlKey.isPressed || kb.rightCtrlKey.isPressed)) Dump();
            }
            catch (Exception e) { Plugin.L.LogError("Key check failed: " + e.Message); }
            if (flashUntil > 0 && Time.unscaledTime > flashUntil) { flashUntil = 0; if (flashLabel != null) flashLabel.text = "SCOUT LAB"; }
            if (Time.unscaledTime < nextScan) return;
            nextScan = Time.unscaledTime + 0.4f;
            try { Scan(); } catch (Exception e) { Plugin.L.LogWarning("Scan failed: " + e.Message); nextScan = Time.unscaledTime + 5f; }
        }

        // ---- every 0.4 s: make sure the button sits in the top bar, show it only on a player profile ----
        void Scan()
        {
            if (root == null || root.panel == null)
            {
                root = null;
                foreach (var d in UnityEngine.Object.FindObjectsByType<UIDocument>(FindObjectsSortMode.None))
                    if (d.gameObject.name == "MainUIDocument") { root = d.rootVisualElement; break; }
                if (root == null) return;
                bar = null;
            }
            ScanOppReport();
            who = ReadProfile();
            if (who == null) { if (button != null && button.parent != null) button.RemoveFromHierarchy(); return; }
            if (bar == null || bar.panel == null) bar = FindVisible(root, "ManagingClubButtons", 0);
            if (bar == null) return;
            if (button == null) MakeButton();
            if (button.parent == null || button.parent != bar) { button.RemoveFromHierarchy(); bar.Add(button); }
        }

        // ---- the opposition scout report pop-up: a button left of its X ----
        void ScanOppReport()
        {
            var pop = FindVisible(root, "HCOppScoutFloatingBlock", 0);
            VisualElement close = pop != null ? FindVisible(pop, "hc-scout-close", 0) : null;
            TextElement name = pop != null ? FirstText(FindVisible(pop, "ReportHeader", 0)) : null;
            if (close == null || close.parent == null || name == null) { oppClub = null; if (oppButton != null && oppButton.parent != null) oppButton.RemoveFromHierarchy(); return; }
            oppClub = Clean(name.text);
            if (oppButton == null) MakeOppButton(pop);
            var host = close.parent;
            if (oppButton.parent != host) { oppButton.RemoveFromHierarchy(); host.Add(oppButton); }
            var c = close.layout; var s = oppButton.style;   // follow the X if the window is resized
            if (c.height > 0) { s.top = new StyleLength(c.y); s.height = new StyleLength(c.height); s.right = new StyleLength(Math.Max(0f, host.layout.width - c.x + 10f)); }
        }

        void MakeOppButton(VisualElement pop)
        {
            var tab = FindVisible(pop, "navigation-tab-title-text", 0)?.TryCast<TextElement>();
            var b = new Button(); b.name = "scoutlab-opp-button"; b.text = "";
            var s = b.style;
            s.position = new StyleEnum<Position>(Position.Absolute);
            s.backgroundColor = new StyleColor(new Color(1f, 1f, 1f, 0.08f));
            var edge = new StyleColor(new Color(1f, 1f, 1f, 0.35f));
            s.borderTopColor = edge; s.borderBottomColor = edge; s.borderLeftColor = edge; s.borderRightColor = edge;
            s.borderTopWidth = new StyleFloat(1f); s.borderBottomWidth = new StyleFloat(1f); s.borderLeftWidth = new StyleFloat(1f); s.borderRightWidth = new StyleFloat(1f);
            var rad = new StyleLength(4f); s.borderTopLeftRadius = rad; s.borderTopRightRadius = rad; s.borderBottomLeftRadius = rad; s.borderBottomRightRadius = rad;
            s.paddingLeft = new StyleLength(12f); s.paddingRight = new StyleLength(12f); s.paddingTop = new StyleLength(0f); s.paddingBottom = new StyleLength(0f);
            s.marginLeft = new StyleLength(0f); s.marginRight = new StyleLength(0f); s.marginTop = new StyleLength(0f); s.marginBottom = new StyleLength(0f);
            oppLabel = new Label("SCOUT LAB"); oppLabel.pickingMode = PickingMode.Ignore;
            var ls = oppLabel.style;
            ls.color = new StyleColor(Color.white);
            if (tab != null) { var r = tab.resolvedStyle; ls.fontSize = new StyleLength(r.fontSize); ls.unityFontDefinition = new StyleFontDefinition(r.unityFontDefinition); ls.letterSpacing = new StyleLength(r.letterSpacing); }
            else ls.fontSize = new StyleLength(14f);
            ls.marginTop = new StyleLength(StyleKeyword.Auto); ls.marginBottom = new StyleLength(StyleKeyword.Auto);
            b.Add(oppLabel);
            b.tooltip = "Open this club's report in Scout Lab";
            onOppClick = (Action)OpenClub;
            b.add_clicked(onOppClick);
            oppButton = b;
            Plugin.L.LogInfo("Scout Lab report button made");
        }

        void MakeButton()
        {
            var club = FindVisible(bar, "ClubButton", 0);
            var clubText = club != null ? FirstText(club) : null;
            var b = new Button();
            b.name = "scoutlab-button";
            b.text = "";
            var s = b.style;
            s.backgroundColor = new StyleColor(new Color(0, 0, 0, 0));
            s.borderTopWidth = new StyleFloat(0f); s.borderBottomWidth = new StyleFloat(0f); s.borderLeftWidth = new StyleFloat(0f); s.borderRightWidth = new StyleFloat(0f);
            s.marginLeft = new StyleLength(6f); s.marginRight = new StyleLength(0f); s.paddingLeft = new StyleLength(10f); s.paddingRight = new StyleLength(10f);
            s.paddingTop = new StyleLength(0f); s.paddingBottom = new StyleLength(0f); s.marginTop = new StyleLength(0f); s.marginBottom = new StyleLength(0f);
            s.height = new StyleLength(new Length(100, LengthUnit.Percent));
            label = new Label("SCOUT LAB");
            label.pickingMode = PickingMode.Ignore;
            var ls = label.style;
            if (clubText != null)
            {
                var r = clubText.resolvedStyle;
                ls.color = new StyleColor(r.color);
                ls.fontSize = new StyleLength(r.fontSize);
                ls.unityFontDefinition = new StyleFontDefinition(r.unityFontDefinition);
                ls.letterSpacing = new StyleLength(r.letterSpacing);
            }
            else { ls.color = new StyleColor(Color.white); ls.fontSize = new StyleLength(16f); }
            ls.marginTop = new StyleLength(StyleKeyword.Auto); ls.marginBottom = new StyleLength(StyleKeyword.Auto);   // centred in the bar
            b.Add(label);
            b.tooltip = "Open this player in Scout Lab";
            onClick = (Action)Open;
            b.add_clicked(onClick);
            button = b;
            Plugin.L.LogInfo("Scout Lab button made");
        }

        // ---- the player on screen: name, club and age from the profile header ----
        string ReadProfile()
        {
            var banner = FindVisible(root, "report-player-banner-max", 0);
            if (banner == null) return null;
            var name = FirstText(banner);
            if (name == null) return null;
            string club = null, age = null;
            var team = FindVisible(root, "PlayingTeam", 0);
            if (team != null) { var t = FirstText(team); if (t != null) club = Clean(t.text); }
            var m = Regex.Match(AllText(banner), @"(\d{1,2}) years old");
            if (m.Success) age = m.Groups[1].Value;
            return Clean(name.text) + "|" + (club ?? "") + "|" + (age ?? "");
        }

        void Open()
        {
            if (who == null) return;
            var p = who.Split('|');
            Launch("#player=" + Uri.EscapeDataString(p[0]) + "&club=" + Uri.EscapeDataString(p[1]) + (p[2] != "" ? "&age=" + p[2] : ""), label, p[0] + " (" + p[1] + ")");
        }

        void OpenClub()
        {
            if (string.IsNullOrEmpty(oppClub)) return;
            Launch("#club=" + Uri.EscapeDataString(oppClub), oppLabel, "report on " + oppClub);
        }

        // open Scout Lab with this link ending; the clicked button's label shows how it went
        void Launch(string hash, Label shown, string what)
        {
            flashLabel = shown;
            try
            {
                var html = FindHtml();
                if (html == null) { Plugin.L.LogWarning("Scout Lab not found: set HtmlPath in BepInEx\\config\\scoutlab.link.cfg"); Flash("NOT FOUND"); return; }
                var url = new Uri(html).AbsoluteUri + hash;
                var exe = FindBrowser();
                if (exe == null) { Plugin.L.LogWarning("No Chrome or Edge found"); Flash("NO BROWSER"); return; }
                Process.Start(new ProcessStartInfo(exe, "\"" + url + "\"") { UseShellExecute = false });
                Plugin.L.LogInfo("Opened " + what + " in Scout Lab");
                Flash("OPENED");
            }
            catch (Exception e) { Plugin.L.LogError("Open failed: " + e); Flash("ERROR"); }
        }

        float flashUntil;
        void Flash(string t) { if (flashLabel == null) return; flashLabel.text = t; flashUntil = Time.unscaledTime + 1.5f; }

        static string FindHtml()
        {
            var cfg = (Plugin.HtmlPath.Value ?? "").Trim().Trim('"');
            if (cfg != "" && File.Exists(cfg)) return cfg;
            var dl = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
            if (!Directory.Exists(dl)) return null;
            return new DirectoryInfo(dl).GetFiles("fm27-scout-lab*.html").OrderByDescending(f => f.LastWriteTimeUtc).Select(f => f.FullName).FirstOrDefault();
        }

        static string FindBrowser()
        {
            string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), pfx = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
                   la = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var chrome = new[] { Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"), Path.Combine(pfx, @"Google\Chrome\Application\chrome.exe"), Path.Combine(la, @"Google\Chrome\Application\chrome.exe") };
            var edge = new[] { Path.Combine(pfx, @"Microsoft\Edge\Application\msedge.exe"), Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe") };
            var want = (Plugin.Browser.Value ?? "auto").Trim().ToLowerInvariant();
            var order = want == "edge" ? edge.Concat(chrome) : chrome.Concat(edge);
            return order.FirstOrDefault(File.Exists);
        }

        // ---- screen helpers ----
        static bool Hidden(VisualElement ve) { try { return ve.resolvedStyle.display == DisplayStyle.None; } catch { return false; } }
        static string TypeName(VisualElement ve) { try { return ve.GetIl2CppType().Name; } catch { return ""; } }

        // first visible element with this name (hidden parts are skipped)
        static VisualElement FindVisible(VisualElement ve, string name, int depth)
        {
            if (ve == null || depth > 90 || Hidden(ve)) return null;
            if (ve.name == name) return ve;
            int n = ve.hierarchy.childCount;
            for (int i = 0; i < n; i++) { var f = FindVisible(ve.hierarchy.ElementAt(i), name, depth + 1); if (f != null) return f; }
            return null;
        }

        // first visible text element with text in it
        static TextElement FirstText(VisualElement ve)
        {
            if (ve == null || Hidden(ve)) return null;
            var te = ve.TryCast<TextElement>();
            if (te != null && !string.IsNullOrWhiteSpace(Clean(te.text ?? ""))) return te;
            int n = ve.hierarchy.childCount;
            for (int i = 0; i < n; i++) { var f = FirstText(ve.hierarchy.ElementAt(i)); if (f != null) return f; }
            return null;
        }

        static string AllText(VisualElement ve)
        {
            var sb = new StringBuilder(); Collect(ve, sb, 0); return sb.ToString();
            static void Collect(VisualElement v, StringBuilder sb, int d)
            {
                if (v == null || d > 60 || Hidden(v)) return;
                var te = v.TryCast<TextElement>(); if (te != null && te.text != null) sb.Append(Clean(te.text)).Append(" | ");
                int n = v.hierarchy.childCount; for (int i = 0; i < n; i++) Collect(v.hierarchy.ElementAt(i), sb, d + 1);
            }
        }

        static string Clean(string s) => Regex.Replace(s ?? "", "<[^>]+>", "").Trim();

        // ---- Ctrl+F9: map the screen ----
        void Dump()
        {
            var sb = new StringBuilder(); int count = 0;
            try
            {
                var docs = UnityEngine.Object.FindObjectsByType<UIDocument>(FindObjectsSortMode.None);
                sb.AppendLine("UIDocuments: " + docs.Length + "   (" + DateTime.Now + ")  profile: " + (who ?? "none"));
                foreach (var d in docs)
                {
                    VisualElement r = null; try { r = d.rootVisualElement; } catch { }
                    sb.AppendLine("== document '" + d.gameObject.name + "' order " + d.sortingOrder);
                    if (r != null) Walk(r, 0, sb, ref count);
                }
            }
            catch (Exception e) { sb.AppendLine("!! " + e); }
            var dir = Path.Combine(Paths.BepInExRootPath, "scoutlab"); Directory.CreateDirectory(dir);
            var file = Path.Combine(dir, "screen_" + (++saved) + ".txt"); File.WriteAllText(file, sb.ToString());
            Plugin.L.LogInfo("Mapped " + count + " elements to " + file);
        }

        static void Walk(VisualElement ve, int depth, StringBuilder sb, ref int count)
        {
            if (count > 80000 || depth > 90) return;
            count++;
            var line = new StringBuilder(new string(' ', depth * 2));
            line.Append(TypeName(ve));
            try { if (!string.IsNullOrEmpty(ve.name)) line.Append(" #").Append(ve.name); } catch { }
            bool hidden = Hidden(ve); if (hidden) line.Append(" [hidden]");
            try { var te = ve.TryCast<TextElement>(); if (te != null && !string.IsNullOrEmpty(te.text)) line.Append(" \"").Append(Clip(te.text)).Append('"'); } catch { }
            try { var r = ve.worldBound; line.Append($" @{r.x:0},{r.y:0} {r.width:0}x{r.height:0}"); } catch { }
            sb.AppendLine(line.ToString());
            if (hidden) return;
            int n = 0; try { n = ve.hierarchy.childCount; } catch { }
            for (int i = 0; i < n; i++) { VisualElement c = null; try { c = ve.hierarchy.ElementAt(i); } catch { } if (c != null) Walk(c, depth + 1, sb, ref count); }
        }

        static string Clip(string s) { s = s.Replace("\n", " ").Replace("\r", " "); return s.Length > 80 ? s.Substring(0, 80) + "…" : s; }
    }
}
