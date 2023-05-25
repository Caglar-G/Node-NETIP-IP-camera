const net = require('net');
const fs = require('fs');
const client = require('http');
const struct = require('python-struct');
const {PromiseSocket} = require("promise-socket")
const util = require('util');
const Mutex = require('async-mutex').Mutex;

const mutex = new Mutex();

//--//
Promise.timeout = function(promise, timeoutInMilliseconds){
    return Promise.race([
        promise, 
        new Promise(function(resolve, reject){
            setTimeout(function() {
                reject("timeout");
            }, timeoutInMilliseconds);
        })
    ]);
};
const timeout = (prom, time) => {
	let timer;
	return Promise.race([
		prom,
		new Promise((_r, rej) => timer = setTimeout(rej, time))
	]).finally(() => clearTimeout(timer));
}
//----//

//--QCODES--//
const QCODES = {
    "AuthorityList": 1470,
    "Users": 1472,
    "Groups": 1474,
    "AddGroup": 1476,
    "ModifyGroup": 1478,
    "DelGroup": 1480,
    "AddUser": 1482,
    "ModifyUser": 1484,
    "DelUser": 1486,
    "ModifyPassword": 1488,
    "AlarmInfo": 1504,
    "AlarmSet": 1500,
    "ChannelTitle": 1046,
    "EncodeCapability": 1360,
    "General": 1042,
    "KeepAlive": 1006,
    "OPMachine": 1450,
    "OPMailTest": 1636,
    "OPMonitor": 1413,
    "OPNetKeyboard": 1550,
    "OPPTZControl": 1400,
    "OPSNAP": 1560,
    "OPSendFile": 0x5F2,
    "OPSystemUpgrade": 0x5F5,
    "OPTalk": 1434,
    "OPTimeQuery": 1452,
    "OPTimeSetting": 1450,
    "NetWork.NetCommon": 1042,
    "OPNetAlarm": 1506,
    "SystemFunction": 1360,
    "SystemInfo": 1020,
}

module.exports = class CAM_NETIP
{ 
    constructor(setup){

        //--Global--//
        this.packet_count = 0;
        this.session = 0;
        this.alive_time =0;
        //----//


        //--Setup Val.--//
        this.tag = setup.tag;
        this.host_ip = setup.host_ip;
        this.host_port = setup.host_port;
        //----//


        //--Calback--//
        this.startAlarmCallback = setup.startAlarmCallback;
        this.stopAlarmCallback = setup.stopAlarmCallback;
        //----//
        
    }

    async configure(){

        //--reset global variables--//
        this.packet_count = 0;
        this.session = 0;
        this.alive_time = 0 ;
        //----//

        //--create socket and promise socket--//
        this._socket = new net.Socket();         
        this.promiseSocket = new PromiseSocket(this._socket)
        this._socket.on('data', this._socketOnData.bind(this));
        //----//

        //--login NETIP--//
        await this._login();
        //----//
    }
                                                                         


    //--login NETIP--//
    async _login(){
        try {
            await this.promiseSocket.connect({port: this.host_port, host: this.host_ip})
            const response = await this._sendData(1000,{
                "EncryptType":"MD5",
                "LoginType": "DVRIP-Web",
                "PassWord": "tlJwpbo6",
                "UserName": "admin",
            })
            this.session = response.SessionID;
            this.alive_time = response.AliveInterval;

            this.set_alarm();
            //--Initilaze Keep Alive--//
            this.aliveInterval = setInterval(this.keep_alive.bind(this), 20000);
            //----//
        } catch (error) {
            console.error("ERROR on" + this.host_ip, error)
        }
    }
    //----//


    //--callback--//
    async _socketOnData(data){
        try {
            data = JSON.parse(data.subarray( 20, data.length-1 ));
            if(Object.keys(data)[0] == "AlarmInfo" 
                && data.AlarmInfo.Status == "Start" )
            {
                this.startAlarmCallback(this, data);
            }
            else if(Object.keys(data)[0] == "AlarmInfo" 
                && data.AlarmInfo.Status == "Stop" )
            {
                this.stopAlarmCallback(data,this.tag);
            }
        } catch (error) {
            console.error("ERROR on" + this.host_ip, error)
        }
       
         // console.log(this.tag, data)
    }
    //----//

    //--some info--//
    async get_system_info(){
        return await this.get_info("SystemInfo", 1020)
    }
    async get_general_info(){
        return await this.get_info("General", 1042)
    }
    async get_system_capabilities(){
        return await this.get_info("SystemFunction", 1360)
    }
    async set_alarm(){
        return await this.get_info("", QCODES["AlarmSet"])
    }
    //----//


    //--get info from cam--//
    async get_info(about, code){
        let data = await this._sendData(code, 
        {   "Name": about, 
            "SessionID": this.session
        })
        return data;
    }
    //----//

     //--get info from cam--//
     async takeAsnap(folderLocation){
        var url = "http://"+this.host_ip+"/webcapture.jpg?command=snap&channel=1&user=admin&password=tlJwpbo6";
        return new Promise((resolve, reject) => {
            client.get(url, (res) => {
                if (res.statusCode === 200) {
                    res.pipe(fs.createWriteStream(folderLocation))
                        .on('error', reject)
                        .once('close', () => {
                            
                            resolve(folderLocation)
                        });
                } else {
                    // Consume response data to free up memory
                    res.resume();
                    reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));

                }
            });
        });
    }
    //----//


    //--send data--//
    async _sendData(command,datatoSend){
        let respose_Head;
        let respose_Data;
        await mutex.runExclusive(async (resolve) => {
            try {
            const data = JSON.stringify(datatoSend);

            const structed = struct.pack(
                "BB2xII2xHI",
                255,
                0,
                this.session,
                this.packet_count,
                command,
                data.length + 2,
            )

            const lastPart = new Buffer([0x0A,0x00]);

            await Promise.timeout(this.promiseSocket.write(structed), 3000);
            await Promise.timeout(this.promiseSocket.write(data), 3000);
            await Promise.timeout(this.promiseSocket.write(lastPart), 3000);

         
            const content = await timeout(this._readWait(), 3000);

          
                respose_Head = content.subarray( 0, 19 );
                respose_Data = JSON.parse(content.subarray( 20, content.length-1 ));
                this.packet_count += 1;
            } catch (error) {
                console.error("ERROR on" + this.host_ip, error)
                clearInterval(this.aliveInterval);
                this._socket.destroy()
                this.configure();
            }
           
        })
        return(respose_Data);   
    }
    //----//


    //--read wait--//
    async _readWait(){
          
        for (let chunk; (chunk = await this.promiseSocket.read()); ) {
            
            if(chunk[chunk.length-1] == 0x00 
            && chunk[chunk.length-2] == 0x0A){
                return chunk;
            }
        }
    }
    //----//


    //--Keep Alive Connection--//
    async keep_alive(){
        await this._sendData(QCODES["KeepAlive"],{
            "Name": "KeepAlive", 
            "SessionID": this.session
        }); 
    }
    //----//



}