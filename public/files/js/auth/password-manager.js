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

    let userEmail = '';
    let passwordChangeSuccessful = false;

    
    function validateEmailFormat(email) {
        
        const studentIdPattern = /^\d{7}$/;
        
        const digitEmailPattern = /^\d{7}@ub\.edu\.ph$/;
        
        const nameEmailPattern = /^[a-zA-Z]+\.[a-zA-Z]+@ub\.edu\.ph$/;
        
        const aIdPattern = /^A-\d{4}@ub\.edu\.ph$/;

        return studentIdPattern.test(email) || digitEmailPattern.test(email) || nameEmailPattern.test(email) || aIdPattern.test(email);
    }

    
    function convertToEmail(input) {
        
        if (/^\d{7}$/.test(input)) {
            return input + '@ub.edu.ph';
        }
        
        return input;
    }

    
    sendCodeBtn.addEventListener('click', function() {
        const emailInput = ubEmail.value.trim();

        
        if (!validateEmailFormat(emailInput)) {
            showAlert('Please enter a valid format: 7-digit ID, firstname.lastname@ub.edu.ph, or A-1234@ub.edu.ph', 'danger');
            return;
        }

        
        const email = convertToEmail(emailInput);

        
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        
        const formData = new FormData();
        formData.append('action', 'send_code');
        formData.append('email', email);

        fetch('/source/handlers/change_password_process.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                userEmail = email;
                step1.style.display = 'none';
                step2.style.display = 'block';
                emailDisplay.textContent = email;
                showAlert('Verification code sent to your email!', 'success');
            } else {
                showAlert(data.message || 'Failed to send code', 'danger');
                sendCodeBtn.disabled = false;
                sendCodeBtn.innerHTML = 'Send Code <i class="fas fa-paper-plane ms-1"></i>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Network error. Please try again.', 'danger');
            sendCodeBtn.disabled = false;
            sendCodeBtn.innerHTML = 'Send Code <i class="fas fa-paper-plane ms-1"></i>';
        });
    });

    
    verifyCodeBtn.addEventListener('click', function() {
        const code = verificationInput.value.trim();

        
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            showAlert('Please enter a valid 6-digit code', 'danger');
            return;
        }

        
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';

        
        const formData = new FormData();
        formData.append('action', 'verify_code');
        formData.append('email', userEmail);
        formData.append('verification_code', code);

        fetch('/source/handlers/change_password_process.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                step2.style.display = 'none';
                step3.style.display = 'block';
                showAlert('Code verified successfully!', 'success');
            } else {
                showAlert(data.message || 'Invalid verification code', 'danger');
                verifyCodeBtn.disabled = false;
                verifyCodeBtn.innerHTML = 'Verify Code';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Network error. Please try again.', 'danger');
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.innerHTML = 'Verify Code';
        });
    });

    
    resendCodeBtn.addEventListener('click', function() {
        this.disabled = true;
        this.textContent = 'Sending...';

        const formData = new FormData();
        formData.append('action', 'resend_code');
        formData.append('email', userEmail);

        fetch('/source/handlers/change_password_process.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('New verification code sent!', 'success');
            } else {
                showAlert(data.message || 'Failed to resend code', 'danger');
            }
            this.disabled = false;
            this.textContent = 'Resend Code';
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Network error. Please try again.', 'danger');
            this.disabled = false;
            this.textContent = 'Resend Code';
        });
    });

    
    changePasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        
        if (newPass.length < 6) {
            showAlert('Password must be at least 6 characters long', 'danger');
            return;
        }

        if (newPass !== confirmPass) {
            showAlert('Passwords do not match!', 'danger');
            return;
        }

        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';

        
        const formData = new FormData();
        formData.append('action', 'change_password');
        formData.append('email', userEmail);
        formData.append('new_password', newPass);
        formData.append('confirm_password', confirmPass);

        fetch('/source/handlers/change_password_process.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                passwordChangeSuccessful = true;
                showAlert('Password changed successfully! Redirecting to login...', 'success');

                
                setTimeout(() => {
                    window.location.href = '/source/pages/auth/Login.php';
                }, 2000);
            } else {
                showAlert(data.message || 'Failed to change password', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Network error. Please try again.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
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

    
    function showAlert(message, type = 'info') {
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        
        document.body.appendChild(alertDiv);

        
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, 4000);
    }

    
    function resetPasswordModal() {
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
        userEmail = '';
        passwordChangeSuccessful = false;
    }

    
    const accountModal = document.getElementById('accountModal');
    if (accountModal) {
        accountModal.addEventListener('hidden.bs.modal', function() {
            
            
            if (!passwordChangeSuccessful) {
                resetPasswordModal();
            }
        });
    }
});