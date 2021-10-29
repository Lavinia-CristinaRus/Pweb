function verify() {
    var p = 0;
    let firstname = document.getElementById("fname").value;
    let lastname = document.getElementById("lname").value;
    const name_pattern = /^((([A-Z])([a-z]+)( ([A-Z])([a-z]+))*)+)$/;
    if(!name_pattern.test(firstname)) {
        alert("The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols");
    }
    else {
        p = p + 1;
    }
    if(!name_pattern.test(lastname)) {
        alert("The name must start with an uppercase, the following letters must be lowercase, the name must have at least 2 letters and cannot contain numbers or symbols");
    }
    else {
        p = p + 1;
    }

    let email = document.getElementById("email").value;
    const email_pattern = /^[A-Za-z](.+)@([A-Za-z]+)\.([A-Za-z]+)$/;
    if(!email_pattern.test(email)) {
        alert("Introduce a valid email address");
    }
    else {
        p = p + 1;
    }

    let phone_nr = document.getElementById("phone").value;
    const tel_pattern = /^07[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/;
    if(!tel_pattern.test(phone_nr)) {
        alert("Introduce a valid phone number (format:07xxxxxxxx)");
    }
    else {
        p = p + 1;
    }

    let dat = document.getElementById("bday").value;
    if(!dat || dat < document.getElementById("bday").min || dat > document.getElementById("bday").max) {
        alert("Please select a valid date");
    }
    else {
        p = p + 1;
    }

    let pass = document.getElementById("pass").value;
    const pass_pattern = /^.+.+.+.+.+.+.+.+$/;
    if(!pass_pattern.test(pass)) {
        alert("The password should contain at least 8 characters");
    }
    else {
        p = p + 1;
    }

    if(p == 6) {
        window.location = "home.html";
    }

}