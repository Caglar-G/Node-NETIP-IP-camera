const camArray= require('../scr/cameraArray');  

(async () => {

    const newCamArray = await new camArray({
        alarmSavedFolder: __dirname,
        alarmStart:async()=>{
           
        },
        alarmStop:async()=>{
            
        }
    });

})();