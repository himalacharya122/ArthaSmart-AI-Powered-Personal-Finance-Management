from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0002_remove_expense_recurring_frequency_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='notes',
            field=models.TextField(
                blank=True,
                help_text='User-authored free-text notes (separate from description).',
            ),
        ),
        migrations.AddField(
            model_name='income',
            name='notes',
            field=models.TextField(
                blank=True,
                help_text='User-authored free-text notes (separate from description).',
            ),
        ),
    ]
