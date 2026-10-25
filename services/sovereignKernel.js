const ALLOWED_MODES = ['EGYPT_ONLY', 'LOCAL'];
const VERSION = '1.1.0-PHASE2';
const REGISTRY = ['qwen2.5:1.5b', 'llama3.2:3b', 'mistral:7b'];
function getMode(){return (process.env.TEOS_SOVEREIGN_MODE||'EGYPT_ONLY').toUpperCase()}
function validateMode(mode){if(!ALLOWED_MODES.includes(mode))throw new Error('MODE_INVALID: '+mode+' not in '+ALLOWED_MODES.join(','));return mode}
export function doctor(){try{const mode=validateMode(getMode());return{version:VERSION,status:mode+' - LOCAL_ONLY - '+REGISTRY.length+' models - OK',mode:mode,allowedModes:ALLOWED_MODES,registry:'LOCAL_ONLY - '+REGISTRY.length+' models',models:REGISTRY,timestamp:new Date().toISOString()}}catch(e){return{version:VERSION,status:e.message,error:e.message,allowedModes:ALLOWED_MODES}}}
export const VERSION_STR=VERSION;
