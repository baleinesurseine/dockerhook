# Docker Hook

## What is dockerhook ?

Dockerhook is a building component triggered by a docker hub webhook.

The POST request is send to a `/:token` URI. The token should be kept secret.
Each token is associated with a script file, stored in the /scripts directory,
as described in the default.json file in the /config directory.

In order to avoid inconsistencies, the scripts cannot run concurrently.
The pending POST requests are queued in a waiting queue.

To avoid attacks, the waiting queue has a limited size. The size limit is set in
the environment variable process.env.WQUEUE, defaulting to 10. All POST requests exceeding
the waiting queue size are rejected with a http 500 status, and lost.

The POST request are answered immediately with a http 204 status (no data returned).
No data is returned to the request upon script completion or script error.

## How to use dockerhook ?
### start the server
```
node server.js
```
To run dockerhook as a daemon, it is suggested to use [forever](https://www.npmjs.com/package/forever) :
```
forever start -l hook.log -o hook.out -e hook.err server.js
```
### configuration
Edit `default.json` in `/config` :
```
{
  "scripts": {
    "token_1": "./scripts/script1.sh",
    "token_2": "./scripts/script2.sh"
  }
}
```
tokens should be at least 256-bits random keys
### scripts
The following template is suggested, for logging readability :
```
#!/bin/bash

#terminal colors
RED=`tput setaf 1`
BLUE=`tput setaf 4`
NC=`tput sgr 0` # Reset default
BLD=`tput bold` # Bold
REV=`tput rev` # Reverse

# Commands used in the script
CLS_CMD1='docker rm -f container'
CLS_CMD2='docker pull owner/image'
CLS_CMD3='docker run --name container -d owner/image'

echo $REV$BLD'----------------------  Begin script  ----------------------'$NC$BLD
echo 'Date:   '`date`
echo 'Script: script.sh'
echo $NC

echo '1 ==> Stop and remove running container'
echo $RED$CLS_CMD1$NC
echo $BLUE
$CLS_CMD1
echo $NC

echo '2 ==> Pull updated version of the image from docker hub'
echo $RED$CLS_CMD1$NC
echo $BLUE
$CLS_CMD1
echo $NC

echo '3 ==> Run new container'
echo $RED$CLS_CMD3$NC
echo $BLUE
$CLS_CMD3
echo $NC

echo $REV$BLD'----------------------  End of script  ----------------------'$NC
```
