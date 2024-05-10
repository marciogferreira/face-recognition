
import { useEffect, useState, useRef } from 'react'
import { FaceResult, GestureResult, Human } from '@vladmandic/human'
import { IUser } from './App'


declare global {
    class ImageCapture {
        constructor(track: MediaStreamTrack);
        takePhoto(): Promise<Blob>;
    }
}
interface Iprops {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onCapture?: (data:any, img: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFaceMatch?: (faceid: Float32Array, img: any) => void;
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
    const [videoSize, setVideoSize] = useState({ width: 640, height: 480 })
    const [imageCapture, setImageCapture] = useState<ImageCapture | null>(null)	

    const refVideo = useRef<HTMLVideoElement>(null)
    const refcanvas = useRef<HTMLCanvasElement>(null)

    const faceValidator: Record<string, { status: boolean | undefined, val: number | number[] }> = { // must meet all rules
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
        boxWidth: { status: false, val: 0 },
        boxHeight: { status: false, val: 0 },
        elapsedMs: { status: undefined, val: 0 }, // total time while waiting for valid face
        faceAngleInRange: { status: false, val:[0,0] }
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
        distanceMax: 0.62, // farthest that face is allowed to be to the cammera in cm
        boxSizeWidth: 120, // size of face box
        boxSizeHeight: 180, // size of face box
        maxFaceAngleRange: 20,
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

    human.draw.options.font = `bold small-caps 18px "Rubik"`
    //human.draw.options.drawLabels = false
    human.draw.options.drawPolygons = false
    human.draw.options.drawGaze = false

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

    const getAngleInDegrees = (angle: number) => angle * 180 / Math.PI

    const loadStream = async () => {
        const cameraOptions: MediaStreamConstraints = { audio: false, video: { facingMode: 'user' } };
        await navigator.mediaDevices.getUserMedia(cameraOptions)
            .then((stream) => {
                if (!refVideo.current || !refcanvas.current) return
                const settings = stream.getVideoTracks()[0].getSettings()
                if(settings.width && settings.height){
                    setVideoSize({ width: settings.width, height: settings.height })
                }
                log(`camera settings: ${settings.width}x${settings.height} ${settings.frameRate}fps`)
                try {
                    setImageCapture(new ImageCapture(stream.getVideoTracks()[0]));
                } catch (err) {
                    log('ImageCapture not supported');
                }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onFaceFound = (curranteFace: FaceResult, img: any) => {
        log(`detected face: ${curranteFace.gender} ${curranteFace.age || 0}y distance ${100 * (curranteFace.distance || 0)}cm/`);
        // @ts-ignore: Unreachable code error
        refVideo.current?.srcObject?.getVideoTracks().forEach( stream => stream.stop())
        
        const faceid = curranteFace.embedding

        if (onCapture) {
            onCapture(faceid, img)
            return
        }
        if (faceid && onFaceMatch && userForMatch && userForMatch.faceid && userForMatch.faceid.length > 0) {
            // @ts-ignore: Unreachable code error
            const result = human.match.find(faceid, userForMatch.faceid , matchOptions)
            if(result?.similarity && result.similarity > options.threshold) {
                onFaceMatch(new Float32Array(faceid), img)
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

    const allValidationsOk = () => {
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
            && faceValidator.gender.status
            && faceValidator.boxWidth.status
            && faceValidator.boxHeight.status
            && faceValidator.faceAngleInRange.status;
    }

    const drawElipse = (force: boolean) => {
        if (!refcanvas.current) return
        const ctx = refcanvas.current.getContext('2d')
        if (!ctx) return

        const isOkStatus = force || (faceValidator.lookingCenter.status && faceValidator.boxWidth.status && faceValidator.boxHeight.status && faceValidator.faceAngleInRange.status)

        ctx.fillStyle = isOkStatus ? 'rgba(0,128,0, 0.47)': 'rgba(242, 242, 242, 0.47)' 
        ctx?.beginPath()
        ctx?.ellipse(videoSize.width/2, videoSize.height/2, options.boxSizeWidth, options.boxSizeHeight, 0, 0, 2 * Math.PI)
        ctx?.rect(videoSize.width, 0, -videoSize.width, videoSize.height)
        ctx.fill();

        ctx?.beginPath()
        ctx.lineWidth = 10
        ctx?.ellipse(videoSize.width / 2, videoSize.height / 2, options.boxSizeWidth, options.boxSizeHeight, 0, 0, 2 * Math.PI)

        ctx.strokeStyle = isOkStatus ? 'green' : 'red'
        ctx?.stroke()

        let text = ''

        if(faceValidator.faceCount.status) {
            if(!faceValidator.distance.status) {
                // @ts-ignore: Unreachable code error
                if(faceValidator.distance.val < options.distanceMin) {
                    text = 'Muito perto da camera'
                } else {
                    text = 'Muito longe da camera'
                }
            } else if (!faceValidator.faceAngleInRange.status) {
                text = 'Centralize o rosto'
            } else if(!faceValidator.boxWidth.status || !faceValidator.boxHeight.status) {
                text = 'Ajuste a distancia do rosto'
            }
        }

        if (force || text === '') {
            text = 'Validando rosto...'
        }

        ctx.strokeStyle = 'white'
        ctx.lineWidth = 1
        ctx.fillStyle = 'green'
        ctx.font = 'bold 22px sans-serif'
        ctx?.strokeText(text, (videoSize.width / 2) - text.length * 5, videoSize.height - 10)
        ctx?.fillText(text, (videoSize.width / 2) - text.length * 5, videoSize.height - 10 )
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
                //Validando se o rosto esta dentro do quadrado
                faceValidator.boxWidth.val = (face[0].size[0]/2) - 60;
                faceValidator.boxHeight.val = (face[0].size[1]/2) + 50;

                //log('- boxWidth (max: ' + faceValidator.boxWidth.val + ', min: ' + faceValidator.boxWidth.val * .7 + '  - boxHeight( max: ' + faceValidator.boxHeight.val + ', min: ' + faceValidator.boxHeight.val * .7)
                //log(' Width ' + options.boxSizeWidth + ' - Height ' + + options.boxSizeHeight)

                faceValidator.boxWidth.status = faceValidator.boxWidth.val <= options.boxSizeWidth && faceValidator.boxWidth.val >= options.boxSizeWidth * .7;
                faceValidator.boxHeight.status = faceValidator.boxHeight.val <= options.boxSizeHeight && faceValidator.boxHeight.val >= options.boxSizeHeight * .7;

                // @ts-ignore: Unreachable code error
                faceValidator.faceAngleInRange.val = [Math.abs(getAngleInDegrees(human.result.face[0].rotation.angle?.yaw)), Math.abs(getAngleInDegrees(human.result.face[0].rotation.angle?.pitch))]
                log('Face Angle:( yaw: ' + faceValidator.faceAngleInRange.val[0] + ' - pitch: ' + faceValidator.faceAngleInRange.val[1])
                log('Face maxAngle: ' + options.maxFaceAngleRange )
                
                faceValidator.faceAngleInRange.status = faceValidator.faceAngleInRange.val[0] <= options.maxFaceAngleRange && faceValidator.faceAngleInRange.val[1] <= options.maxFaceAngleRange
            } 
            // @ts-ignore: Unreachable code error
            faceValidator.timeout.status = faceValidator.elapsedMs.val <= options.maxTime;
            if (allValidationsOk()) {
                log('Face detected and validated')
                log(faceValidator)
                drawFace(true)
                //sleep for 2 second
                await new Promise(r => setTimeout(r, 2000))
                //get imagem from video
                const img = await imageCapture?.takePhoto()
                setIsCapturing(false)
                onFaceFound(face[0], img)
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
                            height={videoSize.height}
                            width={videoSize.width}
                            style={{ position:"fixed" }} >
                        </canvas>
                        <video
                            muted
                            autoPlay
                            ref={refVideo}
                            height={videoSize.height}
                            width={videoSize.width}
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