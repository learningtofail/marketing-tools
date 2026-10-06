# Promotional Capacity Sanity-Checker

## What it answers

Will this discount make money, and can the warehouse and support team handle the volume it creates? You get a green, yellow or red call with the reasons.

## When to use it

Before you commit launch dates for a sale, a flash promotion, or a Black Friday offer.

## What you need

Unit economics: regular price, COGS, shipping, pick and pack cost, payment fee, and baseline orders per day. The promotion: discount, expected volume multiple, duration, extra marketing cost, pull-forward share, and return rates during and outside the promotion. Operations: daily shipping capacity, support tickets per 100 orders, the ticket-rate multiple during a promo, cost per ticket, and daily support capacity.

## How it works

- **Contribution per order** is computed at full price and at promo price, net of returns, COGS, shipping, pick and pack, fees and support cost
- **Incremental contribution** = promo contribution minus marketing cost, minus the baseline contribution you would have earned anyway, minus the margin lost on pull-forward (future orders pulled into the promo window)
- **Break-even volume multiple** is the order multiple at which incremental contribution reaches zero
- **Warehouse utilization** = promo orders per day divided by shipping capacity
- **Support utilization** = promo tickets per day divided by ticket capacity

**Red** triggers on a loss per order, negative incremental contribution, or utilization above 100%. **Yellow** triggers on thin gains, utilization above 80%, margin compression above 50%, or a planned volume below break-even.

The heat map shows incremental contribution across discount levels and volume multiples.

## Reading the results

The break-even multiple is the number to argue about. If a 30% discount needs 3.2 times normal volume and your best past promo reached 2.1, the plan loses money whatever the forecast says.

## Limits and cautions

- Pull-forward is hard to measure. Estimate it from the sales dip in the weeks after past promotions.
- The model uses averages. Peak days inside a promo usually run 1.5 to 2 times the average day.

