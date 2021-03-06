//variables globales
var DEBUG = true;
var threshold = 150;
var idioma = 0;
var speech = new webkitSpeechRecognition();
var texto = "";
var figuraRandom = 0;
var objeto3d = new THREE.Mesh();
var figuraActual = 0;
var figura = 0;

// creo la escena
var scene = new THREE.Scene();
//creo un objeto Three.js como marcador raiz
var markerRoot = new THREE.Object3D();


// uso esta matriz como intermediaria
// convierto una matriz glMatrix en una Matrix4 Three.js
THREE.Matrix4.prototype.setFromArray = function (m) {
    return this.set(
        m[0], m[4], m[8], m[12],
        m[1], m[5], m[9], m[13],
        m[2], m[6], m[10], m[14],
        m[3], m[7], m[11], m[15]
    );
};

function copyMarkerMatrix(arMat, glMat) {
    glMat[0] = arMat.m00;
    glMat[1] = -arMat.m10;
    glMat[2] = arMat.m20;
    glMat[3] = 0;
    glMat[4] = arMat.m01;
    glMat[5] = -arMat.m11;
    glMat[6] = arMat.m21;
    glMat[7] = 0;
    glMat[8] = -arMat.m02;
    glMat[9] = arMat.m12;
    glMat[10] = -arMat.m22;
    glMat[11] = 0;
    glMat[12] = arMat.m03;
    glMat[13] = -arMat.m13;
    glMat[14] = arMat.m23;
    glMat[15] = 1;
}

//funciones que controlan el texto que guiara al usuario al usar la web
function textoInicial() {
    if (idioma == 0) {
        texto = "<strong> Diga el nombre de la figura 3D en ingles: </strong>";
    }
    else {
        texto = "<strong> Say the name of the 3D model in spanish: </strong>";
    }
    document.getElementById("feedback").innerHTML = texto;
}

function correcto() {
    if (idioma == 0) {
        texto = "<font color='green'><strong> &iexcl;CORRECTO! </strong>(pulse siguiente para continuar)</font> ";
    }
    else {
        texto = "<font color='green'><strong> CORRECT! </strong>(press next to continue)</font>";
    }
    document.getElementById("feedback").innerHTML = texto;
}

function incorrecto() {
    if (idioma == 0) {
        texto = "<font color='red'><strong> Incorrecto</strong> (puede que no lo hayas pronunciado correctamente) </font>";
    }
    else {
        texto = "<font color='red'><strong> Incorrect</strong> (maybe you didn't pronounced it correctly) </font>";
    }
    document.getElementById("feedback").innerHTML = texto;
}

//funcion donde se añaden los objetos 3D al marcador
function addModelToScene(geometry, materials) {
    var material = new THREE.MeshFaceMaterial(materials);
    objeto3d = new THREE.Mesh(geometry, material);
    if (figuraActual == 0) { //perro
        objeto3d.scale.set(-100, -100, -100);
        objeto3d.rotation.z = 180 * Math.PI / 180;
        objeto3d.rotation.x = -180 * Math.PI / 180;
        objeto3d.position.y += -50;
    }
    else if (figuraActual == 1) { //caballo
        objeto3d.scale.set(-2, -2, -2);
        objeto3d.rotation.y = -90 * Math.PI / 180;
        objeto3d.position.y += 150;
    }
    markerRoot.add(objeto3d);
}

//para crear un reloj con textura y al que se le movieran las manecillas, esta hecho aparte ya que lleva mas trabajo que el resto de objetos 3D
//reloj
var relojGeom = new THREE.CircleGeometry(65, 32);
var relojTextura = THREE.ImageUtils.loadTexture('https://aschausson.github.io/3dlanguageschool/images/reloj.png');
var relojMaterial = new THREE.MeshLambertMaterial({ map: relojTextura });
var reloj = new THREE.Mesh(relojGeom.clone(), relojMaterial);

//minutero
var minuteroGeom = new THREE.PlaneGeometry(45, 5);
var minuteroMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
var minutero = new THREE.Mesh(minuteroGeom, minuteroMaterial);

//hora
var horaGeom = new THREE.PlaneGeometry(25, 5);
var horaMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
var hora = new THREE.Mesh(horaGeom, horaMaterial);

//rotaciones reloj
reloj.rotation.z = 180 * Math.PI / 180;
minutero.position.z += -2;
hora.position.z += -2;
minuteroGeom.applyMatrix(new THREE.Matrix4().makeTranslation(23, 0, 0));
horaGeom.applyMatrix(new THREE.Matrix4().makeTranslation(13, 0, 0));


function listenerBotones(){
    $('#cambiaEsp_bt').click(cambiaEsp);
    $('#cambiaEng_bt').click(cambiaEng);
    $('#siguienteFig_bt').click(siguienteFig);
}


$(document).ready(function () {
    
    listenerBotones();

    var $canvas = $('#mainCanvas')[0];

    // Create a RGB raster object for the 2D canvas.
    // JSARToolKit uses raster objects to read image data.
    // Note that you need to set canvas.changed = true on every frame.
    var raster = new NyARRgbRaster_Canvas2D($canvas);

    // FLARParam is the thing used by FLARToolKit to set camera parameters.
    // Here we create a FLARParam for images with 320x240 pixel dimensions.
    var param = new FLARParam(640, 480);

    // The FLARMultiIdMarkerDetector is the actual detection engine for marker detection.
    // It detects multiple ID markers. ID markers are special markers that encode a number.
    var detector = new FLARMultiIdMarkerDetector(param, 120);

    // For tracking video set continue mode to true. In continue mode, the detector
    // tracks markers across multiple frames.
    detector.setContinueMode(true);

    //stream to video element
    var $video = $('#mainVideo')[0];
    streamVideo($video);
    var source = $video;
    var renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(640, 480);
    var $container = $('#threejs-container');
    $container.append(renderer.domElement);

    // Create a camera and a marker root object for your Three.js scene.
    var camera = new THREE.Camera();
    scene.add(camera);

    var markerRoots = {};

    // glMatrix matrices are flat arrays.
    var tmp = new Float32Array(16);

    // Next we need to make the Three.js camera use the FLARParam matrix.
    param.copyCameraMatrix(tmp, 10, 10000);
    camera.projectionMatrix.setFromArray(tmp);

    // Create scene and quad for the video.
    //NOTE: must use <canvas> as the texture, not <video>, otherwise there will be a 1-frame lag
    var videoTex = new THREE.Texture($canvas);
    var planeGeometry = new THREE.PlaneGeometry(2, 2, 0);
    var material = new THREE.MeshBasicMaterial({
        map: videoTex,
        depthTest: false,
        depthWrite: false
    });
    var plane = new THREE.Mesh(planeGeometry, material);
    var videoScene = new THREE.Scene();
    var videoCam = new THREE.Camera();
    videoScene.add(plane);
    videoScene.add(videoCam);

    // Create a NyARTransMatResult object for getting the marker translation matrices.
    var resultMat = new NyARTransMatResult();
    var markers = {};
    var emptyFloatArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    //añado dos luces y otra ambiente para iluminar los objetos 3D
    var light = new THREE.DirectionalLight(0xefefff, 2);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    var light = new THREE.DirectionalLight(0xffefef, 2);
    light.position.set(-1, -1, -1).normalize();
    scene.add(light);

    var ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    // en cada frame se hace lo siguiente
    function loop() {
        if ($video.readyState === $video.HAVE_ENOUGH_DATA) {
            // Draw the video frame to the canvas.
            $canvas.getContext('2d').drawImage($video, 0, 0, $canvas.width, $canvas.height);

            // Tell JSARToolKit that the canvas has changed.
            $canvas.changed = true;

            // Update the video texture.
            videoTex.needsUpdate = true;

            //move all marker roots to origin so that they will disappear when not tracked
            Object.keys(markerRoots).forEach(function (key) {
                markerRoots[key].matrix.setFromArray(emptyFloatArray);
                markerRoots[key].matrixWorldNeedsUpdate = true;
            });

            // Do marker detection by using the detector object on the raster object.
            // The threshold parameter determines the threshold value
            // for turning the video frame into a 1-bit black-and-white image.
            //
            //NOTE: THE CANVAS MUST BE THE SAME SIZE AS THE RASTER
            //OTHERWISE WILL GET AN "Uncaught #<Object>" ERROR
            var markerCount = detector.detectMarkerLite(raster, threshold);

            // Go through the detected markers and get their IDs and transformation matrices.
            for (var i = 0; i < markerCount; i++) {
                // Get the ID marker data for the current marker.
                // ID markers are special kind of markers that encode a number.
                // The bytes for the number are in the ID marker data.
                var id = detector.getIdMarkerData(i);

                // Read bytes from the id packet.
                var currId = -1;
                // This code handles only 32-bit numbers or shorter.
                if (id.packetLength <= 4) {
                    currId = 0;
                    for (var j = 0; j < id.packetLength; j++) {
                        currId = (currId << 8) | id.getPacketData(j);
                    }
                }

                // If this is a new id, let's start tracking it.
                if (markers[currId] == null) {
                    //create new object for the marker
                    markers[currId] = {};
                    markerRoot.matrixAutoUpdate = false;
                    markerRoots[currId] = markerRoot;
                }

                // Get the transformation matrix for the detected marker.
                detector.getTransformMatrix(i, resultMat);

                // Copy the marker matrix to the tmp matrix.
                copyMarkerMatrix(resultMat, tmp);

                // Copy the marker matrix over to your marker root object.
                markerRoots[currId].matrix.setFromArray(tmp);
                markerRoots[currId].matrixWorldNeedsUpdate = true;
            }

            // movimientos que hacen las manecillas del reloj
            minutero.rotation.z += -3 * Math.PI / 180;
            hora.rotation.z += (-3 * Math.PI / 180) / 10;

            //Se renderiza la escena
            renderer.autoClear = false;
            renderer.clear();
            renderer.render(videoScene, videoCam);
            renderer.render(scene, camera);
        }

        requestAnimationFrame(loop);
    }



    //se habilita el modo continuo para permitir pausas
    speech.continuous = true;
    //se evitan resultados intermedios
    speech.interimResults = true;
    //se selecciona el idioma espanol como predeterminado
    speech.lang = "es-ES";
    idioma = 0;

    //se coloca el primer texto inicial y el primero objeto 3D y se comienza el reconocimiento de voz
    textoInicial();
    siguienteFig();
    speech.start();

    //se implementa la lógica relacionada con el conocimiento, y se comprueba si lo que se ha dicho coincide con la figura mostrada y el idioma utilizado
    speech.onresult = function (event) {
        for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                var resul = "";
                resul = event.results[i][0].transcript;
                var res = resul.split(" ");
                for (var j = 0; j < res.length; ++j) {
                    console.log(res[j]);
                    if (idioma == 1) {
                        if (res[j] == "perro") {
                            if (figuraRandom == 0) {
                                correcto();
                            }
                        }
                        else if (res[j] == "caballo") {
                            if (figuraRandom == 1) {
                                correcto();
                            }
                        }
                        else if (res[j] == "reloj") {
                            if (figuraRandom == 2) {
                                correcto();
                            }
                        }
                        else
                            incorrecto();
                    }
                    else if (idioma == 0) {
                        if (res[j] == "dog") {
                            if (figuraRandom == 0) {
                                correcto();
                            }
                        }
                        else if (res[j] == "horse") {
                            if (figuraRandom == 1) {
                                correcto();
                            }
                        }
                        else if (res[j] == "clock") {
                            if (figuraRandom == 2) {
                                correcto();
                            }
                        }
                        else
                            incorrecto();
                    }
                }
            }
        }
    }

    //si se deja de escuchar, se reinicia el proceso de escucha
    speech.onend = function () {
        speech.start();
    }
    loop();
});

//funciones para cambiar de idioma
function cambiaEsp() {
    idioma = 0;
    $('#titulo').html('Realidad Aumentada y Reconocimiento de Voz')
    $('#idiomaMensaje').html('Cambiar idioma:')
    $('#feedback').html('Bienvenido')
    $('#siguienteFig_bt').html('Siguiente ->')
    $('#mensajeRA').html('Para hacer uso de la realidad aumentada, use el siguiente marcador QR:')
    speech.lang = "es-ES";
    textoInicial();
}

function cambiaEng() {
    idioma = 1;
    $('#titulo').html('Augmented Reality and Voice Recognition')
    $('#idiomaMensaje').html('Change language:')
    $('#feedback').html(' Welcome ')
    $('#siguienteFig_bt').html('Next ->')
    $('#mensajeRA').html('To use augmented reality, use the following QR code:')
    speech.lang = "en-EN";
    textoInicial();
}

//se elige una figura de forma aleatoria para que se muestre
function siguienteFig() {
    markerRoot.remove(objeto3d);
    if (figuraRandom == 2) {
        markerRoot.remove(reloj);
        markerRoot.remove(minutero);
        markerRoot.remove(hora);
    }

    figuraRandom = Math.floor((Math.random() * 3));

    var jsonLoader = new THREE.JSONLoader();
    if (figuraRandom == 2) {
        markerRoot.add(reloj);
        markerRoot.add(minutero);
        markerRoot.add(hora);
    }
    else if (figuraRandom == 0) {
        figuraActual = 0;
        jsonLoader.load('https://aschausson.github.io/3dlanguageschool/images/dog.js', addModelToScene);
    }
    else if (figuraRandom == 1) {
        figuraActual = 1;
        jsonLoader.load('https://aschausson.github.io/3dlanguageschool/images/horse2.js', addModelToScene);
    }
    // añadir marcador a la escena
    scene.add(markerRoot);
    textoInicial();
}