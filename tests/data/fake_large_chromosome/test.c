#include <stdio.h>
#include <stdlib.h>
static inline int reg2bins(int64_t beg, int64_t end, int min_shift, int n_lvls)
{
    int l, t, s = min_shift + (n_lvls<<1) + n_lvls;
    int nt = 0;
    if (beg >= end) return 0;
    if (end >= 1LL<<s){
       printf("wtf\n");
       end = 1LL<<s;
    }
    for (--end, l = 0, t = 0; l <= n_lvls; s -= 3, t += 1<<((l<<1)+l), ++l) {
        int b, e, n, i;
        b = t + (beg>>s);
        e = t + (end>>s);
        n = e - b + 1;
        for (i = b; i <= e; ++i) {
            printf("%d\n",i);
            nt++;
        }
        //itr->bins.a[itr->bins.n++] = i;
    }
    printf("BINS %d\n",nt);
    return nt;
}

int main() {
    reg2bins(1206719181,1206811938,14,6);
}
