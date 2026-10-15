/* ReFoundly dialog - replaces the browser's plain confirm() / alert() boxes
   with a popup that matches the site (light + dark theme).

   Usage (returns a Promise<boolean>):
     if (!(await rfConfirm('Clear all notification history?', {
           title: 'Clear all notifications?', confirmText: 'Yes, clear all', danger: true }))) return;

     await rfAlert('Saved!', { title: 'Done' });
*/
(function () {
    var css = '\
.rf-overlay{position:fixed;inset:0;z-index:99999999;display:flex;align-items:center;justify-content:center;padding:16px;\
background:rgba(15,25,15,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .2s ease}\
.rf-overlay.rf-show{opacity:1}\
.rf-dialog{width:100%;max-width:400px;background:#fff;color:#333;border-radius:15px;border-top:8px solid #78A454;\
padding:28px 26px 24px;text-align:center;font-family:"Segoe UI",sans-serif;box-shadow:0 15px 40px rgba(0,0,0,.35);\
transform:translateY(14px) scale(.97);transition:transform .2s ease}\
.rf-overlay.rf-show .rf-dialog{transform:none}\
.rf-icon{width:56px;height:56px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;\
background:#eef6e8;color:#6B9E45}\
.rf-dialog.rf-danger .rf-icon{background:#fdecea;color:#e74c3c}\
.rf-icon svg{width:28px;height:28px}\
.rf-title{margin:0 0 8px;font-size:1.25rem;font-weight:700;color:#333}\
.rf-message{margin:0 0 22px;font-size:.98rem;line-height:1.5;color:#666}\
.rf-actions{display:flex;gap:10px;justify-content:center}\
.rf-btn{flex:1;max-width:170px;padding:11px 18px;border:none;border-radius:8px;font-size:.95rem;font-weight:600;\
font-family:inherit;cursor:pointer;transition:background .2s,transform .1s}\
.rf-btn:active{transform:scale(.97)}\
.rf-btn:focus-visible{outline:3px solid rgba(120,164,84,.55);outline-offset:2px}\
.rf-cancel{background:#eef0ee;color:#444}\
.rf-cancel:hover{background:#e0e4e0}\
.rf-ok{background:#83b873;color:#fff}\
.rf-ok:hover{background:#5D8252}\
.rf-dialog.rf-danger .rf-ok{background:#e74c3c}\
.rf-dialog.rf-danger .rf-ok:hover{background:#c0392b}\
:root[data-theme="dark"] .rf-overlay{background:rgba(0,0,0,.72)}\
:root[data-theme="dark"] .rf-dialog{background:#172019;color:#e7ede5;border:1px solid #2c3d2f;border-top:8px solid #5f8f4f;box-shadow:0 15px 40px rgba(0,0,0,.7)}\
:root[data-theme="dark"] .rf-title{color:#e7ede5}\
:root[data-theme="dark"] .rf-message{color:#9aa99a}\
:root[data-theme="dark"] .rf-icon{background:#24402b;color:#8fc46a}\
:root[data-theme="dark"] .rf-dialog.rf-danger .rf-icon{background:#3a1d1d;color:#ff8a80}\
:root[data-theme="dark"] .rf-cancel{background:#26352a;color:#d5ddd3}\
:root[data-theme="dark"] .rf-cancel:hover{background:#2f4132}\
:root[data-theme="dark"] .rf-ok{background:#5f8f4f}\
:root[data-theme="dark"] .rf-ok:hover{background:#77a965}\
:root[data-theme="dark"] .rf-dialog.rf-danger .rf-ok{background:#d9453a}\
:root[data-theme="dark"] .rf-dialog.rf-danger .rf-ok:hover{background:#ef5a4d}\
@media(max-width:420px){.rf-actions{flex-direction:column-reverse}.rf-btn{max-width:none}}';

    var WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    var INFO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

    function ensureCss() {
        if (document.getElementById('rf-dialog-css')) return;
        var s = document.createElement('style');
        s.id = 'rf-dialog-css';
        s.textContent = css;
        document.head.appendChild(s);
    }

    function esc(t) {
        var d = document.createElement('div');
        d.textContent = t == null ? '' : String(t);
        return d.innerHTML;
    }

    function open(message, o, withCancel) {
        o = o || {};
        ensureCss();
        return new Promise(function (resolve) {
            var prevFocus = document.activeElement;
            var overlay = document.createElement('div');
            overlay.className = 'rf-overlay';
            overlay.innerHTML =
                '<div class="rf-dialog' + (o.danger ? ' rf-danger' : '') + '" role="alertdialog" aria-modal="true" aria-labelledby="rfTitle" aria-describedby="rfMsg">' +
                '<div class="rf-icon">' + (o.danger ? WARN : INFO) + '</div>' +
                '<h3 class="rf-title" id="rfTitle">' + esc(o.title || (withCancel ? 'Are you sure?' : 'Notice')) + '</h3>' +
                '<p class="rf-message" id="rfMsg">' + esc(message) + '</p>' +
                '<div class="rf-actions">' +
                (withCancel ? '<button type="button" class="rf-btn rf-cancel">' + esc(o.cancelText || 'Cancel') + '</button>' : '') +
                '<button type="button" class="rf-btn rf-ok">' + esc(o.confirmText || (withCancel ? 'Confirm' : 'OK')) + '</button>' +
                '</div></div>';
            document.body.appendChild(overlay);
            requestAnimationFrame(function () { overlay.classList.add('rf-show'); });

            var okBtn = overlay.querySelector('.rf-ok');
            var cancelBtn = overlay.querySelector('.rf-cancel');
            // destructive actions: focus Cancel so Enter can't delete by accident
            (o.danger && cancelBtn ? cancelBtn : okBtn).focus();

            function close(result) {
                document.removeEventListener('keydown', onKey, true);
                overlay.classList.remove('rf-show');
                setTimeout(function () { overlay.remove(); }, 180);
                if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) {} }
                resolve(result);
            }
            function onKey(e) {
                if (e.key === 'Escape') { e.preventDefault(); close(false); }
                else if (e.key === 'Tab') {            // keep focus inside the dialog
                    var f = overlay.querySelectorAll('button');
                    var first = f[0], last = f[f.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            }
            document.addEventListener('keydown', onKey, true);
            okBtn.addEventListener('click', function () { close(true); });
            if (cancelBtn) cancelBtn.addEventListener('click', function () { close(false); });
            overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(false); });
        });
    }

    window.rfConfirm = function (message, options) { return open(message, options, true); };
    window.rfAlert = function (message, options) { return open(message, options, false).then(function () {}); };
})();