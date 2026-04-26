from fastapi import FastAPI

app = FastAPI(title="AetherWave API", description="Headless Media Factory API")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AetherWave API"}

@app.get("/")
def read_root():
    return {"message": "Welcome to AetherWave"}
