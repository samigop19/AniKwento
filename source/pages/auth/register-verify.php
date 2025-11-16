<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Account - AniKwento</title>

    <link rel="icon" type="image/x-icon" href="../../../public/files/images/AK_tab_logo.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="../../../public/files/images/AK_tab_logo-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="../../../public/files/images/AK_tab_logo-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="../../../public/files/images/AK_tab_logo-180x180.png">
    <link rel="icon" type="image/png" sizes="192x192" href="../../../public/files/images/AK_tab_logo-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="../../../public/files/images/AK_tab_logo-512x512.png">
    <link rel="manifest" href="../../../public/site.webmanifest">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link id="theme-style" rel="stylesheet" href="../../../public/files/css/register-verify.css">
</head>
<body>
    <header>
        <nav class="navbar navbar-expand-md">
            <div class="container">
                <a href="/index.php">
                    <img src="../../../public/files/images/AKlogo.png" alt="AniKwento Logo" class="AK-logo-Header">
                </a>
            </div>
        </nav>
    </header>

    <main class="my-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-6">
                    <div class="verification-container text-center p-4">
                        <h2>Verify Your Email</h2>
                        <p class="mb-4">Please enter the 6-digit verification code sent to your UB email</p>
                        
                        <form id="verificationForm" class="verification-form">
                            <div class="code-inputs d-flex justify-content-center gap-2 mb-4">
                                <input type="text" maxlength="1" class="form-control code-input" required>
                                <input type="text" maxlength="1" class="form-control code-input" required>
                                <input type="text" maxlength="1" class="form-control code-input" required>
                                <input type="text" maxlength="1" class="form-control code-input" required>
                                <input type="text" maxlength="1" class="form-control code-input" required>
                                <input type="text" maxlength="1" class="form-control code-input" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Verify Account</button>
                            <div id="verificationMessage" class="mt-3"></div>
                        </form>
                        
                        <div class="mt-4">
                            <p>Didn't receive the code? <a href="#" id="resendCode">Resend Code</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="fixed-bottom py-3">
        <p class="mb-0">© 2025 AniKwento. All rights reserved.</p>
    </footer>

    <script>
    function showMessage(message, type = 'danger', duration = 5000) {
        const messageDiv = document.getElementById('verificationMessage');
        messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        
        if (duration > 0) {
            setTimeout(() => {
                const alert = messageDiv.querySelector('.alert');
                if (alert) {
                    alert.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => {
                        messageDiv.innerHTML = '';
                    }, 300);
                }
            }, duration);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        const inputs = document.querySelectorAll('.code-input');
        const form = document.getElementById('verificationForm');
        

        inputs.forEach((input, index) => {
            input.addEventListener('input', function() {
                if (this.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
            
          
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });
        
     
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const code = Array.from(inputs).map(input => input.value).join('');
            const email = sessionStorage.getItem('pendingEmail');
            
            if (!email) {
                showMessage('Session expired. Please register again.', 'danger');
                setTimeout(() => {
                    window.location.href = 'Register.php';
                }, 2000);
                return;
            }
            
            if (code.length !== 6) {
                showMessage('Please enter the complete 6-digit code.', 'danger');
                return;
            }
            
            const formData = new FormData();
            formData.append('verification_code', code);
            formData.append('email', email);
            
            fetch('/source/handlers/verify_process.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(`${data.message} Redirecting to login page...`, 'success');
                    sessionStorage.removeItem('pendingEmail');
                    setTimeout(() => {
                        window.location.href = 'Login.php';
                    }, 2000);
                } else {
                    showMessage(data.message, 'danger');
                }
            })
            .catch(error => {
                showMessage('An error occurred. Please try again.', 'danger');
            });
        });
        
      
        document.getElementById('resendCode').addEventListener('click', function(e) {
            e.preventDefault();
            const email = sessionStorage.getItem('pendingEmail');
            
            if (!email) {
                showMessage('Session expired. Please register again.', 'danger');
                return;
            }
            
            const formData = new FormData();
            formData.append('email', email);
            
            this.textContent = 'Sending...';
            this.style.pointerEvents = 'none';
            
            fetch('/source/handlers/resend_code.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    this.textContent = 'Code resent!';
                } else {
                    showMessage(data.message, 'danger');
                    this.textContent = 'Resend Code';
                    this.style.pointerEvents = 'auto';
                }
            })
            .catch(error => {
                showMessage('Error resending code. Please try again.', 'danger');
                this.textContent = 'Resend Code';
                this.style.pointerEvents = 'auto';
            });
            
            setTimeout(() => {
                this.textContent = 'Resend Code';
                this.style.pointerEvents = 'auto';
            }, 30000);
        });
    });
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>