#!/bin/bash

PUBLIC_URL=/my-creditbook/

REACT_APP_INDEX_TITLE="Primus Money My Credit Book"
REACT_APP_INDEX_CONTENT="Manage your Credit Book with Primus Money"

export PUBLIC_URL
export REACT_APP_INDEX_TITLE
export REACT_APP_INDEX_CONTENT

echo "PUBLIC_URL=$PUBLIC_URL"

export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo "SCRIPT_DIR=$SCRIPT_DIR"

PATH=/usr/local/node/bin:$PATH

# uncommend to have no source map
#GENERATE_SOURCEMAP=false
#export GENERATE_SOURCEMAP

cd $SCRIPT_DIR/../

npm --max-old-space-size=8192 run-script build