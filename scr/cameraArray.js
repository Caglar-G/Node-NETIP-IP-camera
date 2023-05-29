/*
*   The purpose of this js is to regularly scan the cameras on the network and 
    also to report it in case of possible disconnections and try to connect again. 
*
*/
const onvif = require('node-onvif');
const camObejct = require('../scr/cameraObject');  


module.exports = class CameraArray
{ 
    constructor(config){
        this.alarmSavedFolder = config.alarmSavedFolder
        this.cameras = []
        this.searchRegularlyInterval = setTimeout(this.searchRegularly.bind(this), 1000);
        this.generalAlarmStart = config.alarmStart;
        this.generalAlarmStop = config.alarmStop;
    }

    /*To find cameras on the network*/
    async findCameraOnNetwork() {
        const $this = this;
        return new Promise(function (fulfilled, rejected) {
            onvif.startProbe().then(async (device_info_list) => {
                console.log("Total found onvif device:", device_info_list.length);
                fulfilled(device_info_list.map(x=> x.xaddrs.toString().split("/")[2].split(":")[0]))
            });
        });
        /*
        onvif.startProbe().then(async (device_info_list) => {
            console.log("Total found onvif device:", device_info_list.length);
            return device_info_list.map(x=> x.xaddrs.toString().split("/")[2].split(":")[0])
            
            for (let index in device_info_list) {
                const ipAddress = device_info_list[index].xaddrs.toString().split("/")[2].split(":")[0]
                console.log(index+"->", ipAddress)
                const newCam = new camObejct({
                        tag:"cam"+index,
                        host_ip:ipAddress,
                        host_port:"34567",
                        startAlarmCallback:async ($this, data) =>{
                            console.log("Alarm Start Received")
                            console.log($this.tag+"_"+ipAddress+"_"+data.AlarmInfo.StartTime.toString())
                            var url = await $this.takeAsnap(
                                this.alarmSavedFolder+"/Alarm_Images/"+$this.tag+"_"+ipAddress+"_"+data.AlarmInfo.StartTime.toString()+".jpg");
    
                        },
                        stopAlarmCallback:async (data, tag) =>{
                            console.log("Alarm Stop Received")
                            console.log(data)
                            console.log(tag, ipAddress)
                        }
                    })
                await newCam.configure();
                $this.cameras.push({
                    device:newCam,
                    status:"online"
                })
            }
            

        });*/
    }
    //----//


    /**
     * 
     * 
     * 
     * 
     */
    async compareFoundedCamerasWithSaved(params) {
      

    }

    //----//

    /**
     *  Scan regularly and add any new cameras connected.
     *  If you see an offline camera, try connecting with it again.
     */
    async searchRegularly() {
        const foundedCameras = await this.findCameraOnNetwork();
        
       
        // add new camera
        const getHostIps = Array.from(this.cameras).map(x => x.device.host_ip);
        const newCameras = foundedCameras.filter(x => !getHostIps.includes(x));
        console.log("new Cameras", newCameras)
        for (let [index, ipAddress] of newCameras.entries()) 
        {
            console.log(index+"->", ipAddress)
            const alarmSavedFolder = this.alarmSavedFolder;
            const newCam = new camObejct({
                    tag:"cam"+index,
                    host_ip:ipAddress,
                    host_port:"34567",
                    startAlarmCallback:async ($this, data) =>{
                        this.generalAlarmStart()
                        console.log("Alarm Start Received")
                        console.log($this.tag+"_"+ipAddress+"_"+data.AlarmInfo.StartTime.toString())
                        var url = await $this.takeAsnap(
                            alarmSavedFolder +"/Alarm_Images/"+$this.tag+"_"+ipAddress+"_"+data.AlarmInfo.StartTime.toString()+".jpg");



                    },
                    stopAlarmCallback:async (data, tag) =>{
                        this.generalAlarmStop()
                        console.log("Alarm Stop Received")
                        console.log(data)
                        console.log(tag, ipAddress)
                    }
                })
            await newCam.configure();
            this.cameras.push({
                device:newCam
            })
        }


        // Is there anyone online from the offline cameras ?
        const getStatus = Array.from(this.cameras).filter(x => x.device.status == "offline").map(x => x.device.host_ip);
        const offlineCamerasNowOnline = foundedCameras.filter(x => getStatus.includes(x));


        console.log("offline device", offlineCamerasNowOnline)
        for (let val of offlineCamerasNowOnline) 
        {  
            //try connect again
            const ss_cam = this.cameras.find(x => x.device.host_ip == val)
            await ss_cam.device.configure()
        }
        
       


        setTimeout(this.searchRegularly.bind(this), 5000);
        
    }
    //----//
}