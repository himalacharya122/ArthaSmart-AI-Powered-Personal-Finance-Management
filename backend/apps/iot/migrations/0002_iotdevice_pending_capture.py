# IoT Receipt Scanner — migration for remote capture flag.
# Adds pending_capture to IoTDevice so the web UI can queue a "shoot" command
# that the ESP32-CAM firmware picks up on its next poll cycle.
#
# To roll back: python manage.py migrate iot 0001
# To remove entirely: delete this file and remove the field from models.py.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("iot", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="iotdevice",
            name="pending_capture",
            field=models.BooleanField(default=False),
        ),
    ]
