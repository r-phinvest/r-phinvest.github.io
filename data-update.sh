#!/bin/bash

IDS=$(psql -qtnA -c "select id from data_sources where id not in (100, 103)")
#IDS="101 102"

echo "entries"
psql -qtnA -c "
select id,
case when id < 100 then 'index' when id < 200 then 'portfolio' else 'fund' end as type,
case when position('(formerly' in name) = 0 then name else trim(substring(name from E'(^.*)\\\(formerly')) end as name,
institution, first_date, last_date
from returns
where id not in (100, 103)
order by institution, name
" | awk '
BEGIN { printf "var entries = [" }
FNR > 1 { printf ",\n" }
{
split($0, a, "|");
printf("{\"id\":%d,\"type\":\"%s\",\"name\":\"%s\",\"institution\":\"%s\",\"startDate\":\"%s\",\"endDate\":\"%s\"}", a[1], a[2], a[3], a[4], a[5], a[6]);
}
END { printf "];" }
' > entries.js

echo "navps"
echo $IDS | tr ' ' '\n' | while read id; do
    echo -n "$id "
    psql -qtnA -c "select extract(epoch from trade_date), value from data_series where id = $id order by trade_date" | awk '
    BEGIN { printf "{\"data\":[" }
    FNR > 1 { printf "," }
    {
	split($0, a, "|");
	printf "[%d,%f]", a[1], a[2];
    }
    END { printf "]}" }' > data/$id.json
done
echo

echo "sma5"
echo $IDS | tr ' ' '\n' | while read id; do
    if [[ $id -lt 100 ]]; then
	ID=id
	TABLE=pse_index_historical_sma5
	VALUE=close
    elif [[ $id -lt 200 ]]; then
	ID=portfolio_id
	TABLE=portfolio_history_sma5
	VALUE=navps
    else
	ID=fund_id
	TABLE=fund_historical_sma5
	VALUE=navps
    fi
    echo -n "$id "
    psql -qtnA -c "select extract(epoch from trade_date), $VALUE from $TABLE where $ID = $id order by trade_date" | awk '
	BEGIN { printf "{\"data\":[" }
	FNR > 1 { printf "," }
	{
	    split($0, a, "|");
	    printf "[%d,%f]", a[1], a[2];
	}
	END { printf "]}" }' > data/${id}-sma5.json
done
echo

for p in 1 3 5 7 10 15 20; do
    echo "period $p"
    echo $IDS | tr ' ' '\n' | while read id; do
	if [[ $id -lt 100 ]]; then
	    ID=id
	    TABLE=pse_index_historical
	    VALUE=close
	elif [[ $id -lt 200 ]]; then
	    ID=portfolio_id
	    TABLE=portfolio_history
	    VALUE=navps
	else
	    ID=fund_id
	    TABLE=fund_historical
	    VALUE=navps
	fi
	echo -n "$id "
	psql -qtnA -c "
select *
from (select extract(epoch from trade_date) as datei,
      (select $VALUE
       from $TABLE
       where $ID = h.$ID
       and trade_date >= (h.trade_date + '$p years'::interval)
       order by trade_date
       limit 1) / $VALUE - 1 as r
      from $TABLE h
      where $ID = $id
      and trade_date <= (current_date - '$p years'::interval)) foo
where r is not null
order by datei
" | awk '
	BEGIN { printf "{\"data\":[" }
	FNR > 1 { printf "," }
	{
	    split($0, a, "|");
	    printf "[%d,%f]", a[1], a[2];
	}
	END { printf "]}" }' > data/${id}-${p}.json
    done
    echo
done

echo "returns"
curl -so returns.html http://localhost/pse/funds?standalone=1

echo "data"
psql -qtnA -F, -c "select code,trade_date,open,high,low,close,volume from pse order by code, trade_date" > data.csv
zip -9 data.zip data.csv
rm data.csv
