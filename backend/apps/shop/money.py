from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal('0.01')


def q(value) -> Decimal:
    """Round to 2 places, half up. All money in this app is Decimal; never float."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def to_minor(value: Decimal) -> int:
    """Rupees -> paise (integer) for the payment gateway."""
    return int((q(value) * 100).to_integral_value())
