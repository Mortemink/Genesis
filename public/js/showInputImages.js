async function previewImages(input = null) {
    if (input === null) {
        return console.error("Ты еблан? Почему this не добавил в previewImages() ?")
    }


    // Смена видимостей
    ['prev', 'next'].forEach(name => {
        document.querySelector(`.${name}`).classList.remove('hidden')
    })

    for (let element of document.getElementsByClassName(`addPictures`)) {
        element.classList.add('hidden')
    }

    document.getElementById("labelInput").setAttribute("for", "null");


    // Магия
    let loadingPanel = document.querySelector('.loadingPanel')
    loadingPanel.classList.remove('hidden')
    loadingPanel.style.animation = 'loadingPanel 2s ease-in-out infinite'


    let filesCount = document.getElementsByName('images')[0].files.length
    let finishedFiles = 0;
    for (let i = 0; i < document.getElementsByName('images')[0].files.length; i++) {
        let file = document.getElementsByName('images')[0].files[i]

        let reader  = new FileReader();

        reader.onloadend = function () {
            let interval = setInterval(() => {
                if (finishedFiles === i) {
                    let div = document.createElement('div')
                    div.classList.add('item')

                    let img = document.createElement('img')
                    img.src = reader.result;

                    div.appendChild(img)

                    document.querySelector('.slider').appendChild(div)

                    finishedFiles++;

                    clearInterval(interval)
                }
            }, 50)
        }

        await reader.readAsDataURL(file);
    }

    let interval = setInterval(() => {
        if (finishedFiles === filesCount) {
            let script = document.createElement('script')
            script.type = 'text/javascript'
            script.src = '/js/sliderCore.js'
            document.body.appendChild(script)

            loadingPanel.remove()

            clearInterval(interval)
        }
    }, 50)
}