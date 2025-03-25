// public/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // Handle quick search buttons
    const quickSearchButtons = document.querySelectorAll('.quick-search');
    quickSearchButtons.forEach(button => {
        button.addEventListener('click', function() {
            const query = this.getAttribute('data-query');
            document.querySelector('input[name="query"]').value = query;
            document.getElementById('searchForm').submit();
        });
    });

    // Function to toggle abstract visibility
    const toggleAbstract = (abstractElement) => {
        if (abstractElement.style.maxHeight === 'none') {
            abstractElement.style.maxHeight = '200px';
            abstractElement.parentElement.querySelector('.toggle-abstract').textContent = 'Show More';
        } else {
            abstractElement.style.maxHeight = 'none';
            abstractElement.parentElement.querySelector('.toggle-abstract').textContent = 'Show Less';
        }
    };

    // Add toggle buttons to long abstracts
    const abstracts = document.querySelectorAll('.abstract');
    abstracts.forEach(abstract => {
        if (abstract.scrollHeight > 200) {
            const toggleButton = document.createElement('button');
            toggleButton.className = 'btn btn-sm btn-link toggle-abstract';
            toggleButton.textContent = 'Show More';
            toggleButton.addEventListener('click', function() {
                toggleAbstract(abstract);
            });
            abstract.parentElement.appendChild(toggleButton);
        }
    });
});

