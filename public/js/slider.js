document.addEventListener('DOMContentLoaded', function() {
    // инициализация 1 слайдера с нужными настройками
    new SimpleAdaptiveSlider('#slider-1', {
        loop: true,
        autoplay: false,
        interval: 5000,
        swipe: true,
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // инициализация слайдера
    var slider = new SimpleAdaptiveSlider('.slider');
    // назначим обработчик при нажатии на кнопку .btn-prev
    document.querySelector('.btn-prev').onclick = function() {
            // перейдём к предыдущему слайду
            slider.prev();
        }
        // назначим обработчик при нажатии на кнопку .btn-next
    document.querySelector('.btn-next').onclick = function() {
        // перейдём к следующему слайду
        slider.next();
    }
});