/* AdResponsive.js - adds the hamburger button + slide-in sidebar on small screens.
   Add before </body> on every Admin page:  <script src="AdResponsive.js"></script> */
(function () {
    function init() {
        const sidebar = document.querySelector('.sidebar');
        const topNav = document.querySelector('.top-nav');
        if (!sidebar || !topNav || document.querySelector('.ad-menu-btn')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ad-menu-btn';
        btn.setAttribute('aria-label', 'Open menu');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
            '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
        topNav.insertBefore(btn, topNav.firstChild);

        const overlay = document.createElement('div');
        overlay.className = 'ad-sidebar-overlay';
        document.body.appendChild(overlay);

        function setOpen(open) {
            document.body.classList.toggle('ad-menu-open', open);
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        btn.addEventListener('click', () => setOpen(!document.body.classList.contains('ad-menu-open')));
        overlay.addEventListener('click', () => setOpen(false));
        sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
        window.addEventListener('resize', () => { if (window.innerWidth > 1024) setOpen(false); });
    }


    /* Copies each column header onto its cells (data-label) so the phone card layout can show it.
       Rows are rendered by the page scripts after load, so we watch for changes. */
    function labelTables() {
        document.querySelectorAll('table').forEach((table) => {
            const heads = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
            if (!heads.length) return;
            table.querySelectorAll('tbody tr').forEach((tr) => {
                if (tr.children.length !== heads.length) return;
                Array.from(tr.children).forEach((td, i) => {
                    if (td.getAttribute('data-label') !== heads[i]) td.setAttribute('data-label', heads[i]);
                });
            });
        });
    }
    function watchTables() {
        labelTables();
        document.querySelectorAll('table tbody').forEach((tbody) => {
            new MutationObserver(labelTables).observe(tbody, { childList: true });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { init(); watchTables(); });
    else { init(); watchTables(); }
})();