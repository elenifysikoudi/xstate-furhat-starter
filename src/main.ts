import { setup, createActor, fromPromise, assign } from "xstate";

const FURHATURI = "127.0.0.1:54321";

async function fhSay(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(text);
  return fetch(`http://${FURHATURI}/furhat/say?text=${encText}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: ""
  });
}


async function fhSound(url: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(url);
  return fetch(`http://${FURHATURI}/furhat/say?url=${encText}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: ""
  });
}
async function fhGetUser() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/users`, {
    method: "GET",
    headers: myHeaders,
  })
}
async function fhAttend() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/attend?user=RANDOM`), {
    method: "POST",
    headers: myHeaders,
  };
}

async function ListeningCarefully() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      name: "ListeningCarefully",
      frames: [
        {
          time: [3.50,3.70], //ADD THE TIME FRAME OF YOUR LIKING
          persist: true,
          params: {NECK_PAN : 20.0
          },
        },
        {
          time : [3.50,3.75],
          persist : true ,
          params  :{ BROW_DOWN_LEFT : 0.7 ,
                     BROW_DOWN_RIGHT : 0.7,
                     EYE_SQUINT_LEFT : 0.7,
                     EYE_SQUINT_RIGHT : 0.7

          },
        },
        {
          time: [3.80], //ADD TIME FRAME IN WHICH YOUR GESTURE RESETS
          persist: true,
          params: {
            reset: true,
          },
        },
        //ADD MORE TIME FRAMES IF YOUR GESTURE REQUIRES THEM
      ],
      class: "furhatos.gestures.Gesture",
    }),
  });
}
async function CrazyEyes() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=false`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      name: "CrazyEyes",
      frames: [
        {
          time: [3.30,3.45], //ADD THE TIME FRAME OF YOUR LIKING
          persist: true,
          params: { 
            "LOOK_UP_LEFT" :0.8,
            "LOOK_LEFT_LEFT": 0.85,
            "LOOK_RIGHT_RIGHT" : 0.85,
            "LOOK_UP_RIGHT" :0.8,
            //"movement" : numbers (degree of movement )
            //ADD PARAMETERS HERE IN ORDER TO CREATE A GESTURE
          },
        },
        {
          time: [3.45], //ADD TIME FRAME IN WHICH YOUR GESTURE RESETS
          persist: true,
          params: {
            reset: true,
          },
        },
        //ADD MORE TIME FRAMES IF YOUR GESTURE REQUIRES THEM
      ],
      class: "furhatos.gestures.Gesture",
    }),
  });
}
async function fhGesture(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(
    `http://${FURHATURI}/furhat/gesture?name=${text}&blocking=true`,
    {
      method: "POST",
      headers: myHeaders,
      body: "",
    },
  );
}

async function fhListen() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/listen`, {
    method: "GET",
    headers: myHeaders,
  })
    .then((response) => response.body)
    .then((body) => body.getReader().read())
    .then((reader) => reader.value)
    .then((value) => JSON.parse(new TextDecoder().decode(value)).message);
}

const dmMachine = setup({
  actors: {
    fhHello: fromPromise<any, null>(async () => {
      return fhSay("Hi");
    }),
    Attend : fromPromise<any, null>(async () => {
      return fhGetUser; 
    }) ,
    fhL: fromPromise<any, null>(async () => {
     return Promise.all([
      fhAttend() ,
      fhListen(),
      ListeningCarefully()
      
     ])
   }),
   CrazyEyes: fromPromise<any, null>(async () => {
    return CrazyEyes();
  }),
  ListenCarefully: fromPromise<any, null>(async () => {
    return ListeningCarefully();
   }),
   fhSpeakG: fromPromise<any, { text: string }>(async ({ input }) => {
    return Promise.all([
      fhAttend() ,
      fhSay(input.text),
      CrazyEyes(),
    ]);
  }),
  fhSound : fromPromise<any, null> (async () => {
    return fromPromise.call([
      fhGesture('Shake'),
      fhSound("https://furhat-audio.s3.eu-north-1.amazonaws.com/110853-Male_mouth_makes_tch_tch_tch_sound_effect-Nightingale_Music_Productions-12655.wav"),
      fhAttend()
    ])
  })
  },
}).createMachine({
  id: "root",
  initial: "Start",
  states: {
    Start: { after: { 1000: "Next" } },
    Next: {
      invoke : {
        src : "Attend",
        onDone : {
          target : "Go",
          actions: ({ event }) => console.log(event.output),
        } ,
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      }
    },
    Go : {
      invoke: {
        src: "fhSpeakG",
        input: {text : "Hello, can you do this?"},
        onDone: {
          target : "Hello",
          actions: ({ event }) => console.log(event.output),
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    Hello: {
      invoke: {
        src: "fhL",
        onDone: {
          target: "Recognised",
          actions: [({ event }) => console.log(event.output),
            assign({ 
              lastResult: ({ event }) => event.output,
            }),
        ]},
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    Recognised: {
      invoke : {
        src : "fhSound",
        onDone: {
          target : "Fail"
        }
      }
    },
    Fail: {},
  },
});

const actor = createActor(dmMachine).start();
console.log(actor.getSnapshot().value);

actor.subscribe((snapshot) => {
  console.log(snapshot.value);
});
