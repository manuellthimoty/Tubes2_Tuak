//Logic untuk mendapatkan HTML dari sebuah URL

export async function scrapeHTML(url:string){
    try{
        //disini untuk akses webnya dan minta dalam bentuk textHTML
        const respon = await fetch(url);
        const textHTML = await respon.text();
        return textHTML;

    } catch (error){
        console.log("Gagal mendapatkan html dari url");
        return null;
    }
}