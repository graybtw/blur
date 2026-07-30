// ======================================================
// BLUR ANNOUNCEMENTS SYSTEM
// ======================================================


function setupAnnouncementSender(root){


const button =
root.querySelector(".publish-announcement");


const input =
root.querySelector(".announcement-input");


const nameInput =
root.querySelector(".announcement-name");


const state =
root.querySelector(".announcement-state");


const count =
root.querySelector(".announcement-count");


const colorButtons =
root.querySelectorAll(".announcement-color-option");


const colorPicker =
root.querySelector(".announcement-color-picker");


const colorCustom =
root.querySelector(".announcement-color-custom");



if(!button || !input || !nameInput){
    console.warn("Announcement elements missing");
    return;
}


let selectedColor = "#ffffff";


function setActiveSwatch(el){

    colorButtons.forEach(b=>b.classList.remove("active"));

    if(colorCustom)
        colorCustom.classList.remove("active");

    if(el)
        el.classList.add("active");

}


colorButtons.forEach(btn=>{

    btn.addEventListener("click", ()=>{

        selectedColor = btn.dataset.color;

        setActiveSwatch(btn);

    });

});


if(colorPicker){

    colorPicker.addEventListener("input", ()=>{

        selectedColor = colorPicker.value;

        setActiveSwatch(colorCustom);

    });

}



function updateCount(){

    if(count){
        count.textContent =
        `${input.value.length} / 200`;
    }

}


input.addEventListener(
"input",
updateCount
);


updateCount();



button.onclick = async ()=>{


const name =
nameInput.value.trim();


const message =
input.value.trim();



if(!name){

state.textContent =
"Missing name";

return;

}



if(!message){

state.textContent =
"Empty message";

return;

}



state.textContent =
"Sending...";



const {error} =
await window.sb
.from("announcements")
.insert({

message:
`${name}: ${message}`,

color:
selectedColor

});



if(error){

console.error(error);

state.textContent =
"Failed";

return;

}



input.value="";
nameInput.value="";

state.textContent =
"Broadcast sent";


updateCount();


};


}



// realtime listener

function setupAnnouncementRealtime(){


window.sb
.channel("global-announcements")
.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"announcements"
},
(payload)=>{

showGlobalAnnouncement(
payload.new.message,
payload.new.color
);

}

)
.subscribe();


}



function showGlobalAnnouncement(message, color){


const old =
document.querySelector(
".blur-announcement"
);


if(old)
old.remove();



const popup =
document.createElement("div");


popup.className =
"blur-announcement";


popup.style.setProperty(
"--announcement-color",
color || "#ffffff"
);


const text =
document.createElement("div");


text.className =
"announcement-text";


text.textContent =
message;


popup.appendChild(text);



document.body.appendChild(
popup
);



requestAnimationFrame(()=>{

popup.classList.add(
"active"
);

});



setTimeout(()=>{


popup.classList.remove(
"active"
);


setTimeout(()=>{

popup.remove();

},700);


},7000);


}



// ======================================================
// SERVER RESTART BROADCAST
// ======================================================


let restartTimer = null;


function setupRestartSender(root){


const secondsInput =
root.querySelector(".dev-restart-seconds");


const startButton =
root.querySelector(".dev-restart-start");


if(!secondsInput || !startButton){
    console.warn("Restart elements missing");
    return;
}


startButton.onclick = async ()=>{


const seconds =
parseInt(secondsInput.value, 10);


if(!seconds || seconds < 1){
    return;
}


startButton.disabled = true;

startButton.textContent =
"Starting...";


const {error} =
await window.sb
.from("restarts")
.insert({

seconds:
seconds

});


startButton.disabled = false;

startButton.textContent =
"Start countdown";


if(error){
    console.error(error);
}


};


}



function setupRestartRealtime(){


window.sb
.channel("global-restarts")
.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"restarts"
},
(payload)=>{

showRestartAnnouncement(
payload.new.seconds
);

}

)
.subscribe();


}



function showRestartAnnouncement(seconds){


const old =
document.querySelector(".site-restart");


if(old)
old.remove();


if(restartTimer){
    clearInterval(restartTimer);
    restartTimer = null;
}


let remaining =
Math.max(0, parseInt(seconds, 10) || 0);


const popup =
document.createElement("div");


popup.className =
"site-restart";


popup.innerHTML = `
<div class="site-restart-inner">
<span class="site-restart-icon">⚠</span>
<div class="site-restart-text">Site restarting in <span class="site-restart-count">${remaining}</span> seconds</div>
<span class="site-restart-icon">⚠</span>
</div>
`;


document.body.appendChild(popup);


const countEl =
popup.querySelector(".site-restart-count");


const textEl =
popup.querySelector(".site-restart-text");


requestAnimationFrame(()=>{

popup.classList.add("active");

});


restartTimer = setInterval(()=>{

remaining--;

if(remaining <= 0){

    clearInterval(restartTimer);
    restartTimer = null;

    if(textEl)
        textEl.textContent = "Restarting now...";

    setTimeout(()=>{

        window.location.reload();

    },1000);

    return;

}

if(countEl){
    countEl.textContent = remaining;
}

},1000);


}



// exported startup

window.setupAnnouncementSystem =
function(root){

setupAnnouncementSender(root);
setupAnnouncementRealtime();

setupRestartSender(root);
setupRestartRealtime();

};