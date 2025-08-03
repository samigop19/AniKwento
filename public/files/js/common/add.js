document.addEventListener('DOMContentLoaded', function() {
    const addNameBtn = document.querySelector('.btn-add-name');
    const studentNamesContainer = document.querySelector('.student-names-container');
    const maxStudents = 5;

    function createStudentInput() {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'student-name-input';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter student name';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-name';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', function() {
            inputGroup.remove();
            updateAddButtonState();
        });
        
        inputGroup.appendChild(input);
        inputGroup.appendChild(removeBtn);
        return inputGroup;
    }

    function updateAddButtonState() {
        const currentInputs = studentNamesContainer.querySelectorAll('.student-name-input').length;
        addNameBtn.disabled = currentInputs >= maxStudents;
    }

    addNameBtn.addEventListener('click', function() {
        const currentInputs = studentNamesContainer.querySelectorAll('.student-name-input').length;
        
        if (currentInputs < maxStudents) {
            studentNamesContainer.appendChild(createStudentInput());
            updateAddButtonState();
        }
    });

    updateAddButtonState();
});