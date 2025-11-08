

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AniKwento Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link id="theme-style" rel="stylesheet" href="../../../public/files/css/Register.css">
</head>
<body>
    <header>
      <nav class="navbar navbar-expand-md">
            <div class="container">
                <a href="../home.html">
                    <img src="../../../public/files/images/AKlogo.png" alt="AniKwento Logo" class="AK-logo-Header">
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link active" href="Login.php">Log In</a></li>
                        <li class="nav-item"><a class="nav-link" href="Register.php">Register</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>

     <main class="my-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-md-8">
                    <div class="login-container">
                        <div class="row g-0">
                            <div class="col-md-6">
                                <div class="welcome-section text-center p-4">
                                    <h1>WELCOME BACK</h1>
                                    <img src="../../../public/files/images/AKlogo.png" alt="AniKwento Logo" class="AK-logo img-fluid my-3"> 
                                    <p>Magical AI stories for English learning fun!</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-section p-4">
                                    <form id="loginForm" method="POST">
                                        <div class="mb-3">
                                            <input type="text" name="email" id="emailInput" class="form-control"
                                                placeholder="UB Mail"
                                                style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0; margin-left: -1.5rem; width: calc(100% + 1.5rem);"
                                                title="Enter your 7-digit student ID, email (firstname.lastname@ub.edu.ph), or ID (A-1234@ub.edu.ph)"
                                                required />
                                        </div>
                                        <div class="mb-3">
                                            <input type="password" name="password" class="form-control"
                                                placeholder="Password"
                                                style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0; margin-left: -1.5rem; width: calc(100% + 1.5rem);"
                                                required />
                                        </div>
                                        <div class="mb-3 text-end">
                                            <a href="ForgotPassword.php" class="forgot" style="
                                                color: #801B32;
                                                text-decoration: none;
                                                font-size: 0.9rem;
                                                font-weight: 500;
                                                transition: all 0.3s ease;
                                                display: inline-flex;
                                                align-items: center;
                                                gap: 0.3rem;
                                            " onmouseover="
                                                this.style.color='#FFC553';
                                                this.style.textDecoration='underline';
                                                this.style.transform='translateX(-3px)';
                                            " onmouseout="
                                                this.style.color='#801B32';
                                                this.style.textDecoration='none';
                                                this.style.transform='translateX(0)';
                                            ">
                                                <i class="fas fa-key" style="font-size: 0.8rem;"></i>
                                                Forgot Password?
                                            </a>
                                        </div>
                                        <button type="submit" class="btn w-100">Login</button>
                                        <div id="loginMessage" class="mt-3 text-center"></div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>


    <footer class="py-3">
        <p class="mb-0">© 2025 AniKwento. All rights reserved.</p>
    </footer>
<script>
    // Function to validate email format
    function validateEmailFormat(email) {
        // Pattern 1: 7-digit student ID (will be converted to email)
        const studentIdPattern = /^\d{7}$/;
        // Pattern 2: 7-digit student ID with @ub.edu.ph
        const digitEmailPattern = /^\d{7}@ub\.edu\.ph$/;
        // Pattern 3: firstname.lastname@ub.edu.ph
        const nameEmailPattern = /^[a-zA-Z]+\.[a-zA-Z]+@ub\.edu\.ph$/;
        // Pattern 4: A-#### format (A-1234@ub.edu.ph)
        const aIdPattern = /^A-\d{4}@ub\.edu\.ph$/;

        return studentIdPattern.test(email) || digitEmailPattern.test(email) || nameEmailPattern.test(email) || aIdPattern.test(email);
    }

    // Function to convert input to full email if needed
    function convertToEmail(input) {
        // If it's just 7 digits, append @ub.edu.ph
        if (/^\d{7}$/.test(input)) {
            return input + '@ub.edu.ph';
        }
        // Otherwise, return as-is (already a full email)
        return input;
    }

    // Notification function
    function showMessage(message, type = 'danger', duration = 5000) {
        const messageDiv = document.getElementById('loginMessage');
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

    function setButtonLoading(button, loading = true) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const emailInput = document.getElementById('emailInput');
        const inputValue = emailInput.value.trim();
        const password = this.querySelector('input[name="password"]').value;
        const submitButton = this.querySelector('button[type="submit"]');

        // Clear any existing messages
        document.getElementById('loginMessage').innerHTML = '';

        // Client-side validation
        if (!validateEmailFormat(inputValue)) {
            showMessage('Please enter a valid format: 7-digit ID, firstname.lastname@ub.edu.ph, or A-1234@ub.edu.ph', 'danger');
            emailInput.focus();
            return;
        }

        if (!password) {
            showMessage('Please enter your password', 'danger');
            this.querySelector('input[name="password"]').focus();
            return;
        }

        // Start loading state
        setButtonLoading(submitButton, true);
        showMessage('<span class="loading-spinner"></span>Logging in...', 'info', 0);

        // Convert to full email if needed
        const email = convertToEmail(inputValue);

        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        
        fetch('../../handlers/login_process.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            setButtonLoading(submitButton, false);
            
            if (data.success) {
                document.getElementById('loginMessage').innerHTML = '';
                showMessage('Login successful! Redirecting to dashboard...', 'success', 3000);
                
                // Add a delay before redirect for better UX
                setTimeout(() => {
                    window.location.href = '../dashboard/StoryDashboard.php';
                }, 1500);
            } else {
                document.getElementById('loginMessage').innerHTML = '';
                showMessage(data.message, 'danger');
                // Clear form on failed login
                this.querySelector('input[name="password"]').value = '';
                emailInput.focus();
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            setButtonLoading(submitButton, false);
            document.getElementById('loginMessage').innerHTML = '';
            showMessage('Network error occurred. Please check your connection and try again.', 'danger');
        });
    });

    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>