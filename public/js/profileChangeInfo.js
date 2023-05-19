function qs(string = '') {
    return document.querySelector(string);
}

function changeDisplayType(type, ) {
    let args = [];
    for (let i = 1; i < arguments.length; i++) {
        args[i-1] = arguments[i];
    }
    type = type === undefined | null ? 'block' : type;
    console.log(args)
    args.forEach(elem => {
        elem.style.display = type;
    });
}
function ChangeEditProfileState(bool, elem) {
    if (typeof bool !== 'boolean' || elem === undefined)
        throw new Error('Ты че ебнулся?');

    elem.style.display = 'none';

    let pEmail = qs('#pEmail'),
        pPass = qs('#pPass'),
        inputEmail = qs('#inputEmail'),
        inputPass = qs('#inputPass'),
        exitForm = qs('#exitForm'),
        saveForm = qs('#saveForm');

    if (bool) {
        changeDisplayType('none', pEmail, pPass, exitForm);
        changeDisplayType(undefined, inputEmail, inputPass, saveForm);
    } else {
        changeDisplayType(undefined, pEmail, pPass, exitForm);
        changeDisplayType('none', inputEmail, inputPass, saveForm);
    }
}

function SaveInfo() {
    let newEmail = qs('#newEmail'),
        newPass = qs('#newPass'),
        inputEmail = qs('#inputEmail'),
        inputPass = qs('#inputPass');

    if (inputEmail.value || inputPass.value) {
        newEmail.value = inputEmail.value;
        newPass.value = inputPass.value;

        const form = qs('#saveForm').forms[0];
        form.submit();
    }
}