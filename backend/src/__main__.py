import sys

import uvicorn

if __name__ == "__main__":
    reload = True
    argv = sys.argv

    if len(argv) == 2:
        reload = sys.argv[1].split("--reload=")[1] == "True"
    uvicorn.run("app:app", host="0.0.0.0", port=8081, reload=reload)
