@echo off
echo Stopping ELK Stack...
docker-compose -f docker-compose-elk.yml down
echo ELK Stack stopped.
pause
