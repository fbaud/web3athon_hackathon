#!/bin/bash

export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo "SCRIPT_DIR=$SCRIPT_DIR"

PATH=/usr/local/node/bin:$PATH

cd $SCRIPT_DIR/../


PUBLIC_URL=/my-creditbook/

REACT_APP_INDEX_TITLE="Primus Money My Progressive Webapp DEV"
REACT_APP_INDEX_CONTENT="Progressive Webapp on Primus Money Wallet"

export PUBLIC_URL
export REACT_APP_INDEX_TITLE
export REACT_APP_INDEX_CONTENT


npm run-script start