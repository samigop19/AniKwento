<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AniKwento Register</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link id="theme-style" rel="stylesheet" href="/public/files/css/Register.css">
</head>
<body>
    <header>
        <nav class="navbar navbar-expand-md">
            <div class="container">
                <a href="/index.php">
                    <img src="/public/files/images/AKlogo.png" alt="AniKwento Logo" class="AK-logo-Header">
                </a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul class="navbar-nav">
                        <li class="nav-item"><a class="nav-link" href="Login.php">Log In</a></li>
                        <li class="nav-item"><a class="nav-link active" href="Register.php">Register</a></li>
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
                                    <h1>WELCOME TO</h1>
                                    <img src="/public/files/images/AKlogo.png" alt="AniKwento Logo" class="AK-logo img-fluid my-3"> 
                                    <p>Magical AI stories for English learning fun!</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-section p-4">
                     <form id="registerForm" method="POST">
                                        <div class="mb-3">
                                            <input type="text" name="first_name" id="firstName" class="form-control"
                                                placeholder="First Name" pattern="[A-Za-zÀ-ÿĀ-žА-я\s\-ñÑ]{2,50}"
                                                style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0; margin-left: -1.5rem; width: calc(100% + 1.5rem);"
                                                title="First name should contain only letters (including ñ, é, etc.), spaces, and hyphens, 2-50 characters" required />
                                        </div>
                                        <div class="mb-3">
                                            <input type="text" name="last_name" id="lastName" class="form-control"
                                                placeholder="Last Name" pattern="[A-Za-zÀ-ÿĀ-žА-я\s\-ñÑ]{2,50}"
                                                style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0; margin-left: -1.5rem; width: calc(100% + 1.5rem);"
                                                title="Last name should contain only letters (including ñ, é, etc.), spaces, and hyphens, 2-50 characters" required />
                                        </div>
                                        <div class="mb-3">
                                            <input type="text" name="email" id="emailInput" class="form-control"
                                                placeholder="UB Mail"
                                                style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0; margin-left: -1.5rem; width: calc(100% + 1.5rem);"
                                                title="Enter your 7-digit student ID, email (firstname.lastname@ub.edu.ph), or ID (A-1234@ub.edu.ph)"
                                                required />
                                        </div>
                                        <div class="mb-3">
                                            <input type="password" name="password" id="password" class="form-control"
                                                placeholder="Password"
                                                style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0; margin-left: -1.5rem; width: calc(100% + 1.5rem);"
                                                required />
                                        </div>
                                        <div class="mb-3">
                                            <input type="password" name="confirm_password" id="confirmPassword" class="form-control"
                                                placeholder="Re-enter Password"
                                                style="padding-left: 0.75rem; border: none; border-bottom: 2px solid #801B32; border-radius: 0; margin-left: -1.5rem; width: calc(100% + 1.5rem);"
                                                required />
                                            <div id="passwordMatch" class="form-text" style="margin-left: 0;"></div>
                                        </div>
                                        <button type="submit" class="btn w-100">Register</button>
                                        <div id="registerMessage" class="mt-3 text-center"></div>
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
function validatePassword(password) {
    return password.length >= 6;
}

function validateName(name) {
    return name.length >= 2 && name.length <= 50 && /^[A-Za-zÀ-ÿĀ-žА-я\s\-ñÑ]+$/.test(name);
}

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

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchDiv = document.getElementById('passwordMatch');
    
    if (confirmPassword.length > 0) {
        if (password === confirmPassword) {
            matchDiv.innerHTML = '<span style="color: green;">✓ Passwords match</span>';
            return true;
        } else {
            matchDiv.innerHTML = '<span style="color: red;">✗ Passwords do not match</span>';
            return false;
        }
    } else {
        matchDiv.innerHTML = '';
        return false;
    }
}


function showMessage(message, type = 'danger', duration = 5000) {
    const messageDiv = document.getElementById('registerMessage');
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

function setRegisterButtonLoading(button, loading = true) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

document.getElementById('firstName').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^A-Za-zÀ-ÿĀ-žА-я\s\-ñÑ]/g, '');
    if (value.length > 50) value = value.substring(0, 50);
    e.target.value = value;
});

document.getElementById('lastName').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^A-Za-zÀ-ÿĀ-žА-я\s\-ñÑ]/g, '');
    if (value.length > 50) value = value.substring(0, 50);
    e.target.value = value;
});

document.getElementById('password').addEventListener('input', function(e) {
    checkPasswordMatch();
});

document.getElementById('confirmPassword').addEventListener('input', function(e) {
    checkPasswordMatch();
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const emailInput = document.getElementById('emailInput');
    const inputValue = emailInput.value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const submitButton = this.querySelector('button[type="submit"]');

    // Clear any existing messages
    document.getElementById('registerMessage').innerHTML = '';

    // Validate first name
    if (!validateName(firstName)) {
        showMessage('First name must be 2-50 characters and contain only letters (including ñ, é, etc.), spaces, and hyphens', 'danger');
        document.getElementById('firstName').focus();
        return;
    }

    // Validate last name
    if (!validateName(lastName)) {
        showMessage('Last name must be 2-50 characters and contain only letters (including ñ, é, etc.), spaces, and hyphens', 'danger');
        document.getElementById('lastName').focus();
        return;
    }

    // Validate email format
    if (!validateEmailFormat(inputValue)) {
        showMessage('Please enter a valid format: 7-digit ID, firstname.lastname@ub.edu.ph, or A-1234@ub.edu.ph', 'danger');
        emailInput.focus();
        return;
    }

    // Validate password
    if (!validatePassword(password)) {
        showMessage('Password must be at least 6 characters long', 'danger');
        document.getElementById('password').focus();
        return;
    }

    // Validate password match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'danger');
        document.getElementById('confirmPassword').focus();
        return;
    }

    // Start loading state
    setRegisterButtonLoading(submitButton, true);
    showMessage('<span class="loading-spinner"></span>Creating your account...', 'info', 0);

    // Convert to full email if needed
    const email = convertToEmail(inputValue);

    const formData = new FormData(this);
    formData.set('email', email);
    
    fetch('/source/handlers/register_process.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        setRegisterButtonLoading(submitButton, false);
        document.getElementById('registerMessage').innerHTML = '';
        
        if (data.success) {
            showMessage('Account created successfully! Verification code sent to your email.', 'success', 4000);
            setTimeout(() => {
                showMessage('Redirecting to verification page...', 'info', 2000);
            }, 1000);
            
            sessionStorage.setItem('pendingEmail', email);
            
            // Add delay for better UX
            setTimeout(() => {
                window.location.href = 'register-verify.php';
            }, 2000);
        } else {
            showMessage(data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        setRegisterButtonLoading(submitButton, false);
        showMessage('Network error occurred. Please check your connection and try again.', 'danger');
    });
});
</script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>