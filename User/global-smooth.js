document.addEventListener("DOMContentLoaded", () => {
    const progressBar = document.createElement("div");
    progressBar.className = "page-progress-bar";
    document.body.prepend(progressBar);

    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href");
        if (
            href &&
            href.endsWith(".html") &&
            !href.startsWith("http") &&
            !href.startsWith("//") &&
            !link.hasAttribute("download") &&
            link.target !== "_blank" &&
            !e.ctrlKey &&
            !e.metaKey
        ) {
            e.preventDefault();
            progressBar.style.width = "75%";
            
            setTimeout(() => {
                progressBar.style.width = "100%";
                window.location.href = href;
            }, 140);
        }
    });
});