// Main JavaScript file for the responsive web application

document.addEventListener('DOMContentLoaded', function() {
    // Initialize any interactive elements or event listeners here

    // Example: Toggle mobile menu
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');

    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }

    // Fetch content from JSON file and populate the page
    fetch('./data/content.json')
        .then(response => response.json())
        .then(data => {
            // Example: Populate a section with data
            const contentSection = document.querySelector('.content');
            contentSection.innerHTML = data.content; // Assuming 'content' is a key in the JSON
        })
        .catch(error => console.error('Error fetching content:', error));
});