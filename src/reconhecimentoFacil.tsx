
import { useEffect, useState, useRef } from 'react'
import { FaceResult, GestureResult, Human } from '@vladmandic/human'
import { IUser } from './App'

interface Iprops {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onCapture?: (data:any) => void;
    onFaceMatch?: (faceid: Float32Array) => void;
    onCancel?: () => void;
    userForMatch?: IUser;
}

const ReconhecimentoFacial: React.FC<Iprops> = (props) => {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onCapture, onFaceMatch, onCancel, userForMatch } = props
    
    const debug = true

    const [loadinglib, setLoadingLib] = useState(true)
    //const [streamOk, setStreamOk] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)

    const refVideo = useRef<HTMLVideoElement>(null)
    const refcanvas = useRef<HTMLCanvasElement>(null)


    const faceValidator: Record<string, { status: boolean | undefined, val: number }> = { // must meet all rules
        faceCount: { status: false, val: 0 },
        faceConfidence: { status: false, val: 0 },
        facingCenter: { status: false, val: 0 },
        lookingCenter: { status: false, val: 0 },
        blinkDetected: { status: false, val: 0 },
        faceSize: { status: false, val: 0 },
        antispoofCheck: { status: false, val: 0 },
        livenessCheck: { status: false, val: 0 },
        distance: { status: false, val: 0 },
        age: { status: false, val: 0 },
        gender: { status: false, val: 0 },
        timeout: { status: true, val: 0 },
        descriptor: { status: false, val: 0 },
        elapsedMs: { status: undefined, val: 0 }, // total time while waiting for valid face
    };

    const humanConfig = { // user configuration for human, used to fine-tune behavior
        cacheSensitivity: 0,
        modelBasePath: '/models',
        filter: { enabled: true, equalization: true }, // lets run with histogram equilizer
        debug: debug,
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

    // const matchOptions = { order: 2, multiplier: 1000, min: 0.0, max: 1.0 }; // for embedding model
    const matchOptions = { order: 2, multiplier: 25, min: 0.2, max: 0.8 }; // for faceres model

    const options = {
        minConfidence: 0.6, // overal face confidence for box, face, gender, real, live
        minSize: 224, // min input to face descriptor model before degradation
        maxTime: 30000, // max time before giving up
        blinkMin: 10, // minimum duration of a valid blink
        blinkMax: 800, // maximum duration of a valid blink
        threshold: 0.5, // minimum similarity
        distanceMin: 0.4, // closest that face is allowed to be to the cammera in cm
        distanceMax: 0.6, // farthest that face is allowed to be to the cammera in cm
        mask: humanConfig.face.detector.mask,
        rotation: humanConfig.face.detector.rotation,
        ...matchOptions,
    };

    const blink = { // internal timers for blink start/end/duration
        start: 0,
        end: 0,
        time: 0,
    };

    let startTime = 0;

    const human = new Human(humanConfig)
    const videoWidth = 640
    const videoHeight = 480 

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log = (msg: any) => {
        if (!debug) return
        const now = new Date().toLocaleTimeString()
        console.log(`${now}: ${msg}`)
    }

    const loadStream = async () => {
        const cameraOptions: MediaStreamConstraints = { audio: false, video: { facingMode: 'user' } };
        await navigator.mediaDevices.getUserMedia(cameraOptions)
            .then((stream) => {
                if (!refVideo.current || !refcanvas.current) return
                refVideo.current.srcObject = stream;
            })
            .catch((err) => {
                //TODO tratar erro caso o usario nao permita o uso da camera
                console.error("error:", err);
            });
    }

    const detectFaceLoop = async () => {
        if (isCapturing) {
            if (!refVideo.current) return
            const video = refVideo.current
            await human.detect(video)
            // sleep for 1 second
            //await new Promise(r => setTimeout(r, 500))
            requestAnimationFrame(detectFaceLoop)
        }
    }

    const onFaceFound = (curranteFace: FaceResult) => {
        log(`detected face: ${curranteFace.gender} ${curranteFace.age || 0}y distance ${100 * (curranteFace.distance || 0)}cm/`);
        if (!refVideo.current || !refVideo.current.srcObject){
            // @ts-ignore: Unreachable code error
            refVideo.current?.srcObject.getTracks().forEach( stream => stream.stop())
        }

        const faceid = curranteFace.embedding

        if (onCapture) {
            onCapture(faceid)
            return
        }
        if (faceid && onFaceMatch && userForMatch && userForMatch.faceid && userForMatch.faceid.length > 0) {
            // @ts-ignore: Unreachable code error
            const result = human.match.find(faceid, userForMatch.faceid , matchOptions)
            if(result?.similarity && result.similarity > options.threshold) {
                //TODO: deveria retornar também uma foto?
                
                onFaceMatch(new Float32Array(faceid))
                return
            }
            log('Face not match')
        }

        onCancelCapture()

    }

    const onCancelCapture = () => { 
        log('Cancel capture')
        if (onCancel) {
            onCancel()
        }
    }

    const allValidationsOk = (faceValidator: Record<string, { status: boolean | undefined, val: number }>) => {
        return faceValidator.faceCount.status
            && faceValidator.faceSize.status
            && faceValidator.blinkDetected.status
            && faceValidator.facingCenter.status
            && faceValidator.lookingCenter.status
            && faceValidator.faceConfidence.status
            && faceValidator.antispoofCheck.status
            && faceValidator.livenessCheck.status
            && faceValidator.distance.status
            && faceValidator.descriptor.status
            && faceValidator.age.status
            && faceValidator.gender.status;
    }

    const drawElipse = (force: boolean) => {
        if (!refcanvas.current) return
        const ctx = refcanvas.current.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = "rgba(242, 242, 242, 0.47)"
        ctx?.beginPath()
        ctx?.ellipse(320, 240, 120, 180, 0, 0, 2 * Math.PI)
        ctx?.rect(640, 0, -640, 480)
        ctx.fill();

        ctx?.beginPath()
        ctx.lineWidth = 10
        ctx?.ellipse(320, 240, 120, 180, 0, 0, 2 * Math.PI)

        ctx.strokeStyle = force || (faceValidator.lookingCenter.status && faceValidator.distance.status) ? 'green' : 'red'
        ctx?.stroke()
    }

    const drawFace = async (force: boolean) => {
        if (!refcanvas.current || !refVideo.current) return
        const interpolated = human.next(human.result)
        refcanvas.current.getContext('2d')?.clearRect(0, 0, refcanvas.current.width, refcanvas.current.height)
        drawElipse(force)
        //human.draw.canvas(refVideo.current, refcanvas.current)
        if (debug) await human.draw.all(refcanvas.current, interpolated)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const checkFace = async () => {
        if (isCapturing) {
            drawFace(false)
            const face = human.result?.face
            faceValidator.faceCount.val = face.length;
            faceValidator.faceCount.status = faceValidator.faceCount.val === 1;
            if (faceValidator.faceCount.status) {

                //console.log('Face detected');
                const gestures: string[] = Object.values(human.result.gesture).map((gesture: GestureResult) => gesture.gesture); // flatten all gestures
                if (gestures.includes('blink left eye') || gestures.includes('blink right eye')) blink.start = human.now(); // blink starts when eyes get closed
                if (blink.start > 0 && !gestures.includes('blink left eye') && !gestures.includes('blink right eye')) blink.end = human.now(); // if blink started how long until eyes are back open
                faceValidator.blinkDetected.status = faceValidator.blinkDetected.status || (Math.abs(blink.end - blink.start) > options.blinkMin && Math.abs(blink.end - blink.start) < options.blinkMax);
                if (faceValidator.blinkDetected.status && blink.time === 0) blink.time = Math.trunc(blink.end - blink.start);
                faceValidator.facingCenter.status = gestures.includes('facing center');
                faceValidator.lookingCenter.status = gestures.includes('looking center'); // must face camera and look at camera
                faceValidator.faceConfidence.val = human.result.face[0].faceScore || human.result.face[0].boxScore || 0;
                faceValidator.faceConfidence.status = faceValidator.faceConfidence.val >= options.minConfidence;
                faceValidator.antispoofCheck.val = human.result.face[0].real || 0;
                faceValidator.antispoofCheck.status = faceValidator.antispoofCheck.val >= options.minConfidence;
                faceValidator.livenessCheck.val = human.result.face[0].live || 0;
                faceValidator.livenessCheck.status = faceValidator.livenessCheck.val >= options.minConfidence;
                faceValidator.faceSize.val = Math.min(human.result.face[0].box[2], human.result.face[0].box[3]);
                faceValidator.faceSize.status = faceValidator.faceSize.val >= options.minSize;
                faceValidator.distance.val = human.result.face[0].distance || 0;
                faceValidator.distance.status = (faceValidator.distance.val >= options.distanceMin) && (faceValidator.distance.val <= options.distanceMax);
                faceValidator.descriptor.val = human.result.face[0].embedding?.length || 0;
                faceValidator.descriptor.status = faceValidator.descriptor.val > 0;
                faceValidator.age.val = human.result.face[0].age || 0;
                faceValidator.age.status = faceValidator.age.val > 0;
                faceValidator.gender.val = human.result.face[0].genderScore || 0;
                faceValidator.gender.status = faceValidator.gender.val >= options.minConfidence;
            } 
            faceValidator.timeout.status = faceValidator.elapsedMs.val <= options.maxTime;
            if (allValidationsOk(faceValidator)) {
                log('Face detected and validated')
                log(faceValidator)
                drawFace(true)
                //sleep for 2 second
                await new Promise(r => setTimeout(r, 2000))
                setIsCapturing(false)
                onFaceFound(face[0])
                return face[0]
            }
            if(!faceValidator.timeout.status) {
                log('Timeout')
                setIsCapturing(false)
                onCancelCapture()
                return
            }
            faceValidator.elapsedMs.val = Math.trunc(human.now() - startTime);
            setTimeout(checkFace, 100)
        }
    }

    const scanFace = async () => {
        if (!refVideo.current) return
        startTime = human.now();
        detectFaceLoop()
        setTimeout(checkFace, 30)
    }

    return loadinglib ? (
                <h3> Carregando Biblioteca...</h3 > 
            ) : (
                <div>
                    <div className="" style={{margin:"0", padding:"0", width:"100vm", height:"100vm", display:"flex", justifyContent:"center", alignItems:"center"}}>
                        <canvas 
                            ref={refcanvas} 
                            id="canvas"
                            height={videoHeight}
                            width={videoWidth}
                            style={{ position:"fixed" }} >
                        </canvas>
                        <video
                            muted
                            autoPlay
                            ref={refVideo}
                            height={videoHeight}
                            width={videoHeight}
                            onPlay={scanFace}
                            playsInline
                            style={{
                                // objectFit: "cover",
                                // height: "360px",
                                borderRadius: "10px",
                                // position: "absolute",
                                overflow: "hidden",
                                display: "block",
                                width: "100%"
                            }}
                        />

                    </div>
                </div>
            )

}

export default ReconhecimentoFacial