document.addEventListener('DOMContentLoaded', function() {
    const toregister = document.getElementById('toregister')
    const toauthoriz = document.getElementById('toauthoriz')

    toregister.addEventListener('click', function(){
        window.location.href = 'Registration2.html'
    });

    toauthoriz.addEventListener("click", function(){
        window.location.href = "Authorization2.html"
    });
});
