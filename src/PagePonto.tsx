import { useEffect, useState, useRef } from 'react'

import { Human } from '@vladmandic/human'

const humanConfig = { // user configuration for human, used to fine-tune behavior
    cacheSensitivity: 0,
    modelBasePath: '/models',
    filter: { enabled: true, equalization: true }, // lets run with histogram equilizer
    debug: true,
    face: {
        enabled: true,
        detector: { rotation: true, return: true, mask: false }, // return tensor is used to get detected face image
        description: { enabled: true }, // default model for face descriptor extraction is faceres
        // mobilefacenet: { enabled: true, modelPath: 'https://vladmandic.github.io/human-models/models/mobilefacenet.json' }, // alternative model
        // insightface: { enabled: true, modelPath: 'https://vladmandic.github.io/insightface/models/insightface-mobilenet-swish.json' }, // alternative model
        iris: { enabled: true }, // needed to determine gaze direction
        emotion: { enabled: false }, // not needed
        antispoof: { enabled: true }, // enable optional antispoof module
        liveness: { enabled: true }, // enable optional liveness module
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: true }, // parses face and iris gestures
};


export default function PagePonto() {

    const human = new Human(humanConfig)
    
    const [loadinglib, setLoadingLib] = useState(true)
    const [streamOk, setStreamOk] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)
    
    const refVideo = useRef<HTMLVideoElement>(null)
    const refcanvas = useRef<HTMLCanvasElement>(null)
    


    useEffect(() => {
        human.load().then(() => {
            human.warmup().then(() => {
                setLoadingLib(false)
            })
        })
        
    }, [])

    useEffect(() => {
        loadStream()
        setIsCapturing(true)
    }, [loadinglib])

    const videoWidth = 350
    const videoHeight = 360
    
    const loadStream = async () => {
        const cameraOptions: MediaStreamConstraints = { audio: false, video: { facingMode: 'user', width: { ideal: document.body.clientWidth } } };
        await navigator.mediaDevices.getUserMedia(cameraOptions)
        .then((stream) => {
            if (!refVideo.current) return
            refVideo.current.srcObject = stream;
            setStreamOk(true)
            refcanvas.current.width = refVideo.current.width
            refcanvas.current.height = refVideo.current.height
            refcanvas.current.style.width = '50%'
            refcanvas.current.style.height = '50%'
        })
        .catch((err) => {
            //TODO tratar erro caso o usario nao permita o uso da camera
            console.error("error:", err);
        });
    }

    const detectFaceLoop = async () => {
        if(isCapturing) {
            if (!refVideo.current) return
            const video = refVideo.current
            await human.detect(video)
            // sleep for 1 second
            await new Promise(r => setTimeout(r, 500))
            requestAnimationFrame(detectFaceLoop)
        }
    
    const scanFace = async () => {
        if (!refVideo.current) return
        detectFaceLoop()

    }


    const drawFace = async () => {
        if (!refcanvas.current) return
        const interpolated = human.next(human.result)
        human.draw.canvas(refVideo.current, refcanvas.current)
        await human.draw.all(refcanvas.current, interpolated)
    }

    if(loadinglib) {
        return (
            <div>
            <h3>Carregando Biblioteca...</h3>
            </div>
        )
    }

    return (
        <div>
        <h1>Bater Ponto</h1>
            <div className="relative flex flex-col items-center p-[10px]">
                <video
                    muted
                    autoPlay
                    ref={refVideo}
                    height={videoHeight}
                    width={videoWidth}
                    onPlay={scanFace}
                    style={{
                        objectFit: "cover",
                        height: "360px",
                        borderRadius: "10px",
                        display: "block",
                    }}
                />
                <canvas ref={refcanvas} id="canvas"></canvas>
            </div>
        </div>
    )
}