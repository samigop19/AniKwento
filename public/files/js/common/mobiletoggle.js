document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const header = document.querySelector('.header');
    let isOpen = false;

    if (!menuToggle || !header) return;

    function closeMenu() {
        isOpen = false;
        header.classList.remove('show');
        document.body.classList.remove('menu-open');
        menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        menuToggle.style.left = '15px';
    }

    function openMenu() {
        isOpen = true;
        header.classList.add('show');
        document.body.classList.add('menu-open');
        menuToggle.innerHTML = '<i class="fas fa-times"></i>';
        menuToggle.style.left = '235px';
    }

    menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    
    document.addEventListener('click', function(event) {
        if (isOpen && !header.contains(event.target) && !menuToggle.contains(event.target)) {
            closeMenu();
        }
    });

    
    const navLinks = header.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            closeMenu();
        });
    });

    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && isOpen) {
            closeMenu();
        }
    });
});