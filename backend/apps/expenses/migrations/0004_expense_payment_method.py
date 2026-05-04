from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0003_expense_notes_income_notes'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='payment_method',
            field=models.CharField(
                blank=True,
                choices=[('card', 'Card'), ('cash', 'Cash'), ('wallet', 'Wallet'), ('bank', 'Bank Transfer')],
                default='',
                max_length=20,
            ),
        ),
    ]
