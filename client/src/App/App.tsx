import React, { useEffect, useState, useRef } from 'react';
import env from '../env.json';
import axios from 'axios';
import './App.css';

export default function App() {  
  useEffect(() => {
      document.title = "Speech Recognition";
  });

  const [stream, setStream] = useState({
    access: false,
    recorder: null,
    error: ""
  });

  const [recording, setRecording] = useState({
    active: false,
    available: false,
    url: ""
  });

  const [transcription, setTranscription] = useState({ 
    available: false,
    data: ""
  }); 

  const [phrase, setPhrase] = useState({ 
    available: false,
    sayPhrase: "",
    translatedPhrase: ""
  }); 
  
  const chunks = useRef([]);

  function getAccess() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async (mic) => {
        let  mediaRecorder = new MediaRecorder(mic, {
            mimeType: "audio/webm"
        });

      await axios({ 
        url: `${env.BACKEND_URL_HOST}/say-phrase`,
        method: 'GET'
      }).then((result) => {
          console.log(result);
          setPhrase({ 
            available: true,
            sayPhrase: result.data.phrase,
            translatedPhrase: result.data.transplatedPhrase
          })
      }).catch((error) => {
          console.log(error);
      });

        const track = mediaRecorder.stream.getTracks()[0];
        track.onended = () => console.log("ended");

        mediaRecorder.onstart = function () {
          setRecording({
            active: true,
            available: false,
            url: ""
          });
        };

        mediaRecorder.ondataavailable = function (e) {
          console.log("data available");
          chunks.current.push(e.data);
        };

        mediaRecorder.onstop = async function () {
          console.log("stopped");

          
            let blob = new Blob(chunks.current, { type : chunks.current[0] });
            chunks.current = [];

            const url = URL.createObjectURL(blob);  

            const formData = new FormData(); 
            formData.append("file", blob); 
            
            await axios({ 
                url: `${env.BACKEND_URL_HOST}/upload-audio`,
                method: 'POST',
                data: formData
            }).then((result) => {
                console.log(result);
                setTranscription({ 
                  available: true,
                  data: result.data.transcription
                })
            }).catch((error) => {
                console.log(error);
            });

          setRecording({
            active: false,
            available: true,
            url
          });
        };

        setStream({
          ...stream,
          access: true,
          recorder: mediaRecorder as any
        });
      })
      .catch((error) => {
        console.log(error);
        setStream({ ...stream, error });
      });
  } 

 
  return (
    <div className="App"> 
      {stream.access ? (
          <div className="audio-container">  
            <p>{phrase.sayPhrase}</p>

            {!recording.active ?  
              <input type={"button"} 
                onClick={() => !recording.active && stream.recorder.start()}  
                value="Start Recording" /> 
            : 
              <input type={"button"} 
                onClick={() => stream.recorder.stop()}  
                value="Stop Recording" />
            }
            
            {
              transcription.available  
              &&  
              <div>
                <p>
                  {transcription.data}
                </p>
                <input 
                  type={"button"}
                  value="Next"
                />
              </div>
            } 
          </div>
        ) : (
          <input type={"button"} 
            onClick={getAccess} 
            value="Get Mic Access" />
        )}
    </div>
  );
} 