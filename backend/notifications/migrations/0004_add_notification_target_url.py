from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_alter_notification_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='target_url',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
