/* ReFoundly theme switcher (light / dark)
   - Saved choice wins; otherwise follow the device setting.
   - Runs in <head> so the theme is applied before the page paints (no white flash).
   - Adds a moon/sun button to the navbar (.nav-icons) on every page that loads it. */
(function () {
    var KEY = 'refoundly-theme';

    function getSaved() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function save(t) {
        try { localStorage.setItem(KEY, t); } catch (e) { /* private mode: ignore */ }
    }
    function systemPrefersDark() {
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    function apply(t) {
        document.documentElement.setAttribute('data-theme', t);
        var btn = document.getElementById('themeToggle');
        if (btn) {
            btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            btn.setAttribute('title', t === 'dark' ? 'Light mode' : 'Dark mode');
            btn.innerHTML = t === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    }

    // Load theme.css automatically (so pages only need the one <script> line).
    // It is placed LAST in <head> so it wins over each page's own CSS.
    (function loadCss() {
        if (document.querySelector('link[data-theme-css]')) return;
        var scripts = document.getElementsByTagName('script');
        var src = scripts[scripts.length - 1].src || '';
        var base = src.substring(0, src.lastIndexOf('/') + 1);
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = base + 'Theme.css';
        link.setAttribute('data-theme-css', '');
        document.head.appendChild(link);
    })();

    var current = getSaved() || (systemPrefersDark() ? 'dark' : 'light');
    apply(current);

    document.addEventListener('DOMContentLoaded', function () {
        var bar = document.querySelector('.nav-icons');
        if (bar && !document.getElementById('themeToggle')) {
            var btn = document.createElement('button');
            btn.id = 'themeToggle';
            btn.type = 'button';
            btn.className = 'theme-toggle';
            bar.insertBefore(btn, bar.firstChild);
            btn.addEventListener('click', function () {
                current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                save(current);
                apply(current);
            });
        }
        apply(current);
    });

    // Follow the device if the person never picked a theme themselves
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var onChange = function (e) { if (!getSaved()) apply(e.matches ? 'dark' : 'light'); };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
    }
})();