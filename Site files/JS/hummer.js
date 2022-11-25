// I will be creating a different pen with touch support but right // now I have no time for it due to school

const slider = document.querySelector(".items");
const slides = document.querySelectorAll(".item");
const button = document.querySelectorAll(".button");

let current = 0;
let prev = 4;
let next = 1;

for (let i = 0; i < button.length; i++) {
	button[i].addEventListener("click", () => i == 0 ? gotoPrev() : gotoNext());
}

const gotoPrev = () => current > 0 ? gotoNum(current - 1) : gotoNum(slides.length - 1);

const gotoNext = () => current < 4 ? gotoNum(current + 1) : gotoNum(0);

const gotoNum = number => {
	current = number;
	prev = current - 1;
	next = current + 1;

	for (let i = 0; i < slides.length; i++) {
		slides[i].classList.remove("active");
		slides[i].classList.remove("prev");
		slides[i].classList.remove("next");
	}

	if (next == 5) {
		next = 0;
	}

	if (prev == -1) {
		prev = 4;
	}



	slides[current].classList.add("active");
	currentCH = slides[current].getElementsByClassName('infoNA')[0];
	currentCH.classList.add("info");
	currentCH.classList.remove("infoNA");
	slides[prev].classList.add("prev");
	prevCH = null
	if (slides[prev].getElementsByClassName('infoNA')[0]) {
		prevCH = slides[prev].getElementsByClassName('infoNA')[0];
		prevCH.classList.remove("info");
	} else {
		prevCH = slides[prev].getElementsByClassName('info')[0];
		prevCH.classList.add("infoNA");
		prevCH.classList.remove("info");
	}
	// prevCH = slides[prev].getElementsByClassName('infoNA')[0];
	// prevCH.classList.add("infoNA");
	// prevCH.classList.remove("info");
	slides[next].classList.add("next");
	if (slides[next].getElementsByClassName('infoNA')[0]) {
		nextCH = slides[next].getElementsByClassName('infoNA')[0];
		nextCH.classList.remove("info");
	} else {
		nextCH = slides[next].getElementsByClassName('info')[0];
		nextCH.classList.add("infoNA");
		nextCH.classList.remove("info");
	}
	// nextCH = slides[next].getElementsByClassName('infoNA')[0];
	// 	nextCH.classList.add("infoNA");
	// 	nextCH.classList.remove("info");
}