const onvif = require('node-onvif');
const camObejct = require('../scr/cameraObject');  

var cameras = [];

(async () => {

    /*
    *   To find ip cameras connected to the local network
    *   IP cameras that support the netip protocol also support onvif
    *   We use onvif only to get ip address of cameras
    *   To find ip cameras connected to the local network
    */
    onvif.startProbe().then(async (device_info_list) => {
        console.log("Total found onvif device:", device_info_list.length);
        let index = 0
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
                            __dirname+"/Alarm_Images/"+$this.tag+"_"+ipAddress+"_"+data.AlarmInfo.StartTime.toString()+".jpg");

                    },
                    stopAlarmCallback:async (data, tag) =>{
                        console.log("Alarm Stop Received")
                        console.log(data)
                        console.log(tag, ipAddress)
                    }
                })
            await newCam.configure();
            cameras.push(newCam)
         }


    });
})();