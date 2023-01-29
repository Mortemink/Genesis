function changeCss () {
    var navElement = document.querySelector("header");
    this.scrollY > 970 ? navElement.style.opacity = 0 : navElement.style.opacity = 1;
  }
  
  window.addEventListener("scroll", changeCss , false);