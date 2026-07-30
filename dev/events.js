// ======================================================
// BLUR EVENTS SYSTEM
// Admin-triggered fun effects — raining tacos, money rain,
// etc — shown to every connected user for a set duration.
// ======================================================


const EVENT_TYPES = {

  tacos: {
    label: "Raining Tacos",
    emojis: ["🌮"],
    mode: "rain"
  },

  money: {
    label: "Money Rain",
    emojis: ["💵","💰","🤑"],
    mode: "rain"
  },

  confetti: {
    label: "Confetti Party",
    emojis: ["🎉","🎊"],
    mode: "rain"
  },

  meteor: {
    label: "Meteor Shower",
    emojis: ["☄️"],
    mode: "diagonal"
  },

  balloons: {
    label: "Balloon Party",
    emojis: ["🎈"],
    mode: "rise"
  },

  hearts: {
    label: "Heart Storm",
    emojis: ["💖","💕","❤️"],
    mode: "rain"
  }

};


let eventSpawnTimer = null;
let eventCleanupTimer = null;


function setupEventSender(root){


const typeSelect =
root.querySelector(".dev-event-type");


const durationInput =
root.querySelector(".dev-event-duration");


const unitSelect =
root.querySelector(".dev-event-unit");


const startButton =
root.querySelector(".dev-event-start");


const state =
root.querySelector(".dev-event-state");


if(!typeSelect || !durationInput || !unitSelect || !startButton){
    console.warn("Event elements missing");
    return;
}


startButton.onclick = async ()=>{


const type =
typeSelect.value;


const amount =
parseInt(durationInput.value, 10);


const unitSeconds =
parseInt(unitSelect.value, 10);


if(!EVENT_TYPES[type]){

state.textContent =
"Unknown event";

return;

}


if(!amount || amount < 1){

state.textContent =
"Invalid duration";

return;

}


const durationSeconds =
amount * unitSeconds;


const endsAt =
new Date(
Date.now() + durationSeconds * 1000
).toISOString();


state.textContent =
"Starting...";

startButton.disabled = true;


const {error} =
await window.sb
.from("events")
.insert({

type:
type,

duration:
durationSeconds,

ends_at:
endsAt

});


startButton.disabled = false;


if(error){

console.error(error);

state.textContent =
error.message || "Failed";

return;

}


state.textContent =
"Event started";


};


}



function setupEventRealtime(){


window.sb
.channel("global-events")
.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"events"
},
(payload)=>{

const remainingMs =
new Date(payload.new.ends_at).getTime() - Date.now();

if(remainingMs > 0){

    playGlobalEvent(
        payload.new.type,
        remainingMs
    );

}

}

)
.subscribe();


checkActiveEvent();


}



async function checkActiveEvent(){


const {data, error} =
await window.sb
.from("events")
.select("*")
.gt("ends_at", new Date().toISOString())
.order("created_at", {ascending:false})
.limit(1);


if(error){
    console.error(error);
    return;
}


if(data && data.length){

const remainingMs =
new Date(data[0].ends_at).getTime() - Date.now();

if(remainingMs > 0){
    playGlobalEvent(data[0].type, remainingMs);
}

}


}



function ensureFxLayer(){


let layer =
document.querySelector(".site-event-fx");


if(!layer){

layer = document.createElement("div");
layer.className = "site-event-fx";

document.body.appendChild(layer);

}


return layer;


}



function spawnParticle(layer, config){


const emoji =
config.emojis[
Math.floor(Math.random() * config.emojis.length)
];


const particle =
document.createElement("span");


particle.className =
`site-event-particle site-event-${config.mode}`;


particle.textContent =
emoji;


const left =
Math.random() * 100;

const duration =
4 + Math.random() * 3;

const delay =
Math.random() * 0.4;

const size =
24 + Math.random() * 20;


particle.style.left = `${left}vw`;
particle.style.fontSize = `${size}px`;
particle.style.animationDuration = `${duration}s`;
particle.style.animationDelay = `${delay}s`;

if(config.mode === "diagonal"){
    particle.style.left = `${60 + Math.random() * 40}vw`;
}


particle.addEventListener("animationend", ()=>{
    particle.remove();
});


layer.appendChild(particle);


}



function playGlobalEvent(type, durationMs){


const config =
EVENT_TYPES[type];


if(!config){
    console.warn("Unknown event type:", type);
    return;
}


if(eventSpawnTimer){
    clearInterval(eventSpawnTimer);
    eventSpawnTimer = null;
}


if(eventCleanupTimer){
    clearTimeout(eventCleanupTimer);
    eventCleanupTimer = null;
}


const layer =
ensureFxLayer();


eventSpawnTimer = setInterval(()=>{

spawnParticle(layer, config);
spawnParticle(layer, config);

}, 180);


eventCleanupTimer = setTimeout(()=>{

clearInterval(eventSpawnTimer);
eventSpawnTimer = null;

// let already-falling particles finish, then drop the layer
setTimeout(()=>{

    if(layer && !layer.children.length){
        layer.remove();
    }

}, 8000);

}, durationMs);


}



// exported startup

window.setupEventSystem =
function(root){

setupEventSender(root);
setupEventRealtime();

};