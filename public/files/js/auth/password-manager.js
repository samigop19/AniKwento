document.addEventListener('DOMContentLoaded', function() {
    
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resendCodeBtn = document.getElementById('resendCodeBtn');
    const emailDisplay = document.getElementById('emailDisplay');
    const ubEmail = document.getElementById('ubEmail');
    const verificationInput = document.querySelector('.verification-input');
    const changePasswordForm = document.getElementById('changePasswordForm');

    
    sendCodeBtn.addEventListener('click', function() {
        const email = ubEmail.value;
        
        
        if (!email.endsWith('@ub.edu.ph')) {
            alert('Please enter a valid UB email address');
            return;
        }

        
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        
        setTimeout(() => {
            step1.style.display = 'none';
            step2.style.display = 'block';
            emailDisplay.textContent = email;
        }, 2000);
    });

    
    verifyCodeBtn.addEventListener('click', function() {
        const code = verificationInput.value;
        
        
        if (code.length !== 6) {
            alert('Please enter a valid 6-digit code');
            return;
        }

        
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        
        
        setTimeout(() => {
            step2.style.display = 'none';
            step3.style.display = 'block';
        }, 1500);
    });

    
    resendCodeBtn.addEventListener('click', function() {
        this.disabled = true;
        this.textContent = 'Sending...';
        
        
        setTimeout(() => {
            this.disabled = false;
            this.textContent = 'Resend Code';
            alert('New verification code has been sent!');
        }, 2000);
    });

    
    changePasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        
        if (newPass.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }

        if (newPass !== confirmPass) {
            alert('Passwords do not match!');
            return;
        }

        
        alert('Password changed successfully!');
        
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
        modal.hide();

        
        setTimeout(() => {
            step1.style.display = 'block';
            step2.style.display = 'none';
            step3.style.display = 'none';
            ubEmail.value = '';
            verificationInput.value = '';
            changePasswordForm.reset();
            sendCodeBtn.disabled = false;
            sendCodeBtn.innerHTML = 'Send Code <i class="fas fa-paper-plane ms-1"></i>';
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.innerHTML = 'Verify Code';
        }, 300);
    });

    
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); 
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');

            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
                this.setAttribute('aria-label', 'Hide password');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
                this.setAttribute('aria-label', 'Show password');
            }
        });
    });
});