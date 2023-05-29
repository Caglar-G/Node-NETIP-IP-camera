# Node-NETIP-IP-camera
Node library for communicating with ip cameras using the NETIP protocol


#### It was developed based on this project (I owe you my thanks):
- [python-dvr](https://github.com/NeiroNx/python-dvr)

## Library
There are two js library
1. cameraObject.js (main library, connects with camera.)
2. cameraArray.js (It builds on cameraObject.js. It constantly scans the cameras on the network, adds new ones if there are any, and try reconnects if the connection with the cameras is lost.)


## Tested cameras
* [Misecu](https://tr.aliexpress.com/item/4000063384971.html?spm=a2g0o.order_list.order_list_main.279.553b3d122Zilhh&gatewayAdapt=glo2tur)
* [Besder](https://tr.aliexpress.com/item/32836794402.html?spm=a2g0o.order_list.order_list_main.179.553b3d122Zilhh&gatewayAdapt=glo2tur)

## ToDo
1. Add light control for cameras with visible white light on them.
2. Add audio file playback for cameras with built-in speakers
