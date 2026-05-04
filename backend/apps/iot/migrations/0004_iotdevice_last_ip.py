# IoT Receipt Scanner — migration for device LAN IP field.
# Adds last_ip to IoTDevice so the web UI can construct a direct snapshot
# URL for the live preview modal (GET http://{last_ip}/snapshot).
# Populated by PollView reading the X-Device-IP header from the firmware.
#
# To roll back: python manage.py migrate iot 0002
# To remove entirely: delete this file and remove the field from models.py.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("iot", "0003_merge_20260504_2329"),
    ]

    operations = [
        migrations.AddField(
            model_name="iotdevice",
            name="last_ip",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Last reported LAN IP (IPv4 or IPv6). Populated by poll endpoint.",
                max_length=45,
            ),
        ),
    ]
