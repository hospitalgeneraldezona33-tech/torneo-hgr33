import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendPasswordResetEmail,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,runTransaction,serverTimestamp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{getStorage,ref,uploadBytes,getDownloadURL}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import{firebaseConfig}from"./firebase-config.js";

// Reglas del torneo (Reglamento HGR No. 33, punto 6): mínimo 10 y máximo 15 jugadores por equipo.
const MIN_PLAYERS = 10;
const MAX_PLAYERS = 15;

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const $=id=>document.getElementById(id);let user=null,teamId=null,count=0;

$("tabLogin").onclick=()=>showAuth(true);$("tabRegister").onclick=()=>showAuth(false);
function showAuth(login){$("loginForm").classList.toggle("hidden",!login);$("registerForm").classList.toggle("hidden",login);$("tabLogin").classList.toggle("active",login);$("tabRegister").classList.toggle("active",!login)}
function message(id,text,error=false){$(id).textContent=text;$(id).className="message "+(error?"err":"ok")}
$("loginForm").onsubmit=async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value)}catch(x){message("loginMsg","Correo o contraseña incorrectos.",true)}};
$("registerForm").onsubmit=async e=>{e.preventDefault();if($("registerPassword").value!==$("registerPassword2").value)return message("registerMsg","Las contraseñas no coinciden.",true);try{await createUserWithEmailAndPassword(auth,$("registerEmail").value.trim(),$("registerPassword").value);message("registerMsg","Cuenta creada correctamente.",false)}catch(x){message("registerMsg",authText(x.code),true)}};
$("resetPassword").onclick=async()=>{let email=$("loginEmail").value.trim();if(!email)return message("loginMsg","Escribe tu correo primero.",true);try{await sendPasswordResetEmail(auth,email);message("loginMsg","Revisa tu correo para restablecer la contraseña.")}catch(x){message("loginMsg","No fue posible enviar el correo.",true)}};
$("logout").onclick=()=>signOut(auth);

function authText(c){return({"auth/email-already-in-use":"Ese correo ya está registrado.","auth/weak-password":"La contraseña debe tener al menos 8 caracteres.","auth/invalid-email":"Correo electrónico no válido."})[c]||"No fue posible crear la cuenta."}
function esc(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;")}
function uid(){return(crypto.randomUUID?crypto.randomUUID():"pid-"+Date.now()+"-"+Math.random().toString(16).slice(2))}

function addPlayer(p={}){
  if($("players").children.length>=MAX_PLAYERS){updatePlayerCounter();return}
  count++;
  let d=document.createElement("div");
  d.className="player";
  d.dataset.pid=p.pid||uid(); // ID estable del jugador: evita que las fotos se mezclen entre jugadores al eliminar/reordenar filas
  d.innerHTML=`<div class="player-head"><span>Jugador ${count}</span><button type="button" class="secondary remove">Eliminar</button></div><div class="pgrid"><input class="pn" placeholder="Nombre completo*" value="${esc(p.name)}"><input class="pi" placeholder="Matrícula / ID*" value="${esc(p.id)}"><input class="pa" placeholder="Área de adscripción*" value="${esc(p.area)}"><input class="num" placeholder="Dorsal" value="${esc(p.number)}"><label>Fotografía*<input class="photo" type="file" accept="image/jpeg,image/png"><img class="preview ${p.photoUrl?"":"hidden"}" src="${esc(p.photoUrl)}"></label></div>`;
  d.querySelector(".remove").onclick=()=>{d.remove();renumber()};
  d.querySelector(".photo").onchange=e=>{let f=e.target.files[0];if(f){if(f.size>5e6){alert("La fotografía supera 5 MB.");e.target.value="";return}d.querySelector(".preview").src=URL.createObjectURL(f);d.querySelector(".preview").classList.remove("hidden")}};
  $("players").appendChild(d);
  updatePlayerCounter();
}
function renumber(){[...$("players").children].forEach((d,i)=>d.querySelector(".player-head span").textContent=`Jugador ${i+1}`);count=$("players").children.length;updatePlayerCounter()}
function updatePlayerCounter(){
  let n=$("players").children.length;
  $("playerCounter").textContent=`${n} / ${MAX_PLAYERS} jugadores (mínimo ${MIN_PLAYERS} requeridos)`;
  $("playerCounter").className="hint "+(n<MIN_PLAYERS?"err":"ok");
  $("addPlayer").disabled=n>=MAX_PLAYERS;
}
function teamData(){return{teamName:$("teamName").value.trim(),category:$("category").value,captainName:$("captainName").value.trim(),captainId:$("captainId").value.trim(),captainArea:$("captainArea").value.trim(),captainPhone:$("captainPhone").value.trim(),players:[...$("players").children].map(d=>({pid:d.dataset.pid,name:d.querySelector(".pn").value.trim(),id:d.querySelector(".pi").value.trim(),area:d.querySelector(".pa").value.trim(),number:d.querySelector(".num").value.trim(),photoUrl:d.querySelector(".preview").getAttribute("src")||"",file:d.querySelector(".photo").files[0]||null}))}}

function validate(t,send){
  if(!t.teamName||!t.category||!t.captainName||!t.captainId||!t.captainArea||!t.captainPhone)return"Completa todos los datos del equipo y capitán.";
  if(t.players.length<MIN_PLAYERS)return`El reglamento exige un mínimo de ${MIN_PLAYERS} jugadores por equipo. Llevas ${t.players.length}.`;
  if(t.players.length>MAX_PLAYERS)return`El reglamento permite un máximo de ${MAX_PLAYERS} jugadores por equipo.`;
  if(t.players.some(p=>!p.name||!p.id||!p.area))return"Completa los datos de todos los jugadores.";
  let ids=t.players.map(p=>p.id.trim().toLowerCase()).filter(Boolean);
  if(new Set(ids).size!==ids.length)return"Hay matrículas/ID duplicados entre los jugadores. Verifica el roster.";
  let numbers=t.players.map(p=>p.number.trim()).filter(Boolean);
  if(new Set(numbers).size!==numbers.length)return"Hay números de dorsal repetidos entre los jugadores.";
  if(send&&t.players.some(p=>!p.photoUrl&&!p.file))return"Todos los jugadores deben tener fotografía.";
  if(send&&(!$("acceptRules").checked||!$("notWorking").checked||!$("privacy").checked))return"Acepta las tres declaraciones antes de enviar a validación.";
  return"";
}

async function uploadPhoto(pid,file){if(!file)return null;if(!["image/jpeg","image/png"].includes(file.type))throw Error("Solo se permiten fotos JPG o PNG.");if(file.size>5e6)throw Error("Cada fotografía debe pesar máximo 5 MB.");let r=ref(storage,`torneo-hgr33/${user.uid}/${teamId}/jugadores/${pid}`);await uploadBytes(r,file,{contentType:file.type});return getDownloadURL(r)}

// Folio consecutivo y sin duplicados: se asigna con una transacción de Firestore (contador compartido en /counters),
// en vez de localStorage, que generaba folios repetidos al usarse desde distintos dispositivos o navegadores.
async function assignFolio(category){
  let prefix=category==="Femenil"?"FEM":"VAR";
  let counterRef=doc(db,"counters",prefix);
  return runTransaction(db,async tx=>{
    let snap=await tx.get(counterRef);
    let next=(snap.exists()?snap.data().value:0)+1;
    tx.set(counterRef,{value:next},{merge:true});
    return `HGR33-${prefix}-${String(next).padStart(3,"0")}`;
  });
}

async function save(send){
  let t=teamData(),v=validate(t,send);
  if(v)return message("saveMsg",v,true);
  $("saveDraft").disabled=$("sendValidation").disabled=true;
  message("saveMsg","Guardando información y fotografías...");
  try{
    teamId=teamId||crypto.randomUUID();
    let players=[];
    for(let p of t.players){
      let url=p.photoUrl;
      if(p.file)url=await uploadPhoto(p.pid,p.file);
      players.push({pid:p.pid,name:p.name,id:p.id,area:p.area,number:p.number,photoUrl:url||""});
    }
    let old=await getDoc(doc(db,"teams",teamId));
    let oldData=old.exists()?old.data():{};
    let folio=oldData.folio||await assignFolio(t.category);

    // Si el equipo ya estaba VALIDADO y el capitán vuelve a editar/enviar, regresa a revisión:
    // evita que cambios posteriores a la validación queden aprobados sin que el administrador los revise de nuevo.
    let wasValidated=oldData.status==="VALIDADO";
    let status=send?"PENDIENTE DE VALIDACIÓN":"BORRADOR";

    let data={
      ownerUid:user.uid,ownerEmail:user.email,folio,...t,players,status,
      acceptedRules:$("acceptRules").checked,confirmedNotWorking:$("notWorking").checked,privacyAccepted:$("privacy").checked,
      adminNote:wasValidated?"":(oldData.adminNote||""),
      updatedAt:serverTimestamp()
    };
    delete data.file;
    await setDoc(doc(db,"teams",teamId),data,{merge:true});
    await setDoc(doc(db,"userProfiles",user.uid),{teamId,updatedAt:serverTimestamp()},{merge:true});

    $("statusPill").textContent=data.status;
    $("statusPill").className="pill "+(data.status==="VALIDADO"?"valid":data.status==="RECHAZADO"?"reject":"");
    $("folioBox").textContent="Folio: "+folio;
    $("adminNote").classList.add("hidden");
    if(data.adminNote){$("adminNote").textContent="Observación del administrador: "+data.adminNote;$("adminNote").classList.remove("hidden")}

    message("saveMsg",wasValidated&&send?"Tu equipo ya estaba validado; al editarlo vuelve a quedar pendiente de revisión.":(send?"Inscripción enviada a validación.":"Borrador guardado."));
  }catch(e){
    console.error(e);
    message("saveMsg",e.message||"No fue posible guardar.",true);
  }finally{
    $("saveDraft").disabled=$("sendValidation").disabled=false;
  }
}

async function load(){
  let p=await getDoc(doc(db,"userProfiles",user.uid));
  if(p.exists()&&p.data().teamId){
    teamId=p.data().teamId;
    let s=await getDoc(doc(db,"teams",teamId));
    if(s.exists()){
      let d=s.data();
      $("teamName").value=d.teamName||"";$("category").value=d.category||"";$("captainName").value=d.captainName||"";$("captainId").value=d.captainId||"";$("captainArea").value=d.captainArea||"";$("captainPhone").value=d.captainPhone||"";
      $("acceptRules").checked=!!d.acceptedRules;$("notWorking").checked=!!d.confirmedNotWorking;$("privacy").checked=!!d.privacyAccepted;
      $("players").innerHTML="";count=0;(d.players||[]).forEach(addPlayer);
      $("statusPill").textContent=d.status||"BORRADOR";
      $("statusPill").className="pill "+(d.status==="VALIDADO"?"valid":d.status==="RECHAZADO"?"reject":"");
      $("folioBox").textContent=d.folio?"Folio: "+d.folio:"Sin folio";
      $("adminNote").classList.add("hidden");
      if(d.adminNote){$("adminNote").textContent="Observación del administrador: "+d.adminNote;$("adminNote").classList.remove("hidden")}
      updatePlayerCounter();
      return;
    }
  }
  for(let i=0;i<MIN_PLAYERS;i++)addPlayer();
}

$("addPlayer").onclick=()=>addPlayer();$("saveDraft").onclick=()=>save(false);$("sendValidation").onclick=()=>save(true);
onAuthStateChanged(auth,async u=>{user=u;if(u){$("authView").classList.add("hidden");$("captainView").classList.remove("hidden");$("accountEmail").textContent=u.email;try{await load()}catch(e){console.error(e);message("saveMsg","Configura Firebase para utilizar la plataforma.",true)}}else{$("authView").classList.remove("hidden");$("captainView").classList.add("hidden")}});
